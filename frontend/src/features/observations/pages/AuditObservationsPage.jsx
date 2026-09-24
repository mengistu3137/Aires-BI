import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAudit } from "@/features/audits/hooks/useAudit.js";
import { useAuditObservations } from "../hooks/useAuditObservations.js";
import { useUpdateObservation } from "../hooks/useObservationMutations.js";
import { FastProductSearch } from "../components/FastProductSearch.jsx";
import { RapidPriceInput } from "../components/RapidPriceInput.jsx";
import { ObservationProgress } from "../components/ObservationProgress.jsx";
import { ObservationEmptyState } from "../components/ObservationEmptyState.jsx";
import { ObservationAvailabilityBadge } from "../components/ObservationAvailabilityBadge.jsx";
import { formatPrice } from "../utils/observation.utils.js";
import { enqueueObservation, syncObservation } from "../offline/observationQueue.js";
import { formatProductName } from "@/utils/formatters.js";

/**
 * Deterministic client observation id — stable across retries.
 */
const buildClientObservationId = (auditId, productId) => `obs_${auditId}_${productId}`;

export const AuditObservationsPage = () => {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: audit, isLoading: auditLoading } = useAudit(auditId);
  const { data, isLoading, isError, error } = useAuditObservations(auditId);
  const updateObservation = useUpdateObservation();

  const observations = data?.observations || [];

  const queryKey = useMemo(() => ["observations", "audit", auditId, {}], [auditId]);

  const products = useMemo(
    () => audit?.assignment?.items?.map((item) => item.product).filter(Boolean) || [],
    [audit]
  );

  // ────────────────────────────────────────────────────────────
  // observationsByProduct — latest observation per product
  // ────────────────────────────────────────────────────────────
  const observationsByProduct = useMemo(() => {
    const map = {};
    for (const o of observations) {
      const existing = map[o.productId];
      if (
        !existing ||
        new Date(o.capturedAt).getTime() >= new Date(existing.capturedAt).getTime()
      ) {
        map[o.productId] = o;
      }
    }
    return map;
  }, [observations]);

  // ────────────────────────────────────────────────────────────
  // REF that always points to the LATEST observationsByProduct.
  // This is critical — without it, async callbacks would read stale
  // closures of the map. With it, we always see the freshest state,
  // even mid-chain.
  // ────────────────────────────────────────────────────────────
  const observationsByProductRef = useRef(observationsByProduct);
  useEffect(() => {
    observationsByProductRef.current = observationsByProduct;
  }, [observationsByProduct]);

  const auditStatusRef = useRef(audit?.status);
  useEffect(() => {
    auditStatusRef.current = audit?.status;
  }, [audit?.status]);

  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const completedIds = useMemo(
    () => new Set(Object.keys(observationsByProduct)),
    [observationsByProduct]
  );

  const totalCount = products.length;
  const observedCount = completedIds.size;
  const pendingCount = Math.max(0, totalCount - observedCount);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterMode, setFilterMode] = useState("PENDING");
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const completionShownRef = useRef(false);

  // ────────────────────────────────────────────────────────────
  // Defensive: track product ids currently being saved.
  // While a productId is in this set, another submit for the same
  // product is REJECTED (not queued). This blocks rapid double-Enter
  // and re-taps from creating duplicates even before the cache
  // catches up.
  // ────────────────────────────────────────────────────────────
  const inFlightProductsRef = useRef(new Set());

  // ────────────────────────────────────────────────────────────
  // Serialized save chain — one network operation at a time.
  // ────────────────────────────────────────────────────────────
  const saveChainRef = useRef(Promise.resolve());

  // ────────────────────────────────────────────────────────────
  // Cache invalidation
  // ────────────────────────────────────────────────────────────
  const invalidateDependentQueries = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["observations", "audit", auditId],
    });
    queryClient.invalidateQueries({ queryKey: ["observations", "list"] });
    queryClient.invalidateQueries({
      queryKey: ["audits", "detail", auditId],
    });
    queryClient.invalidateQueries({ queryKey: ["audits"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }, [queryClient, auditId]);

  const upsertObservationInCache = useCallback(
    (formattedObservation) => {
      queryClient.setQueryData(queryKey, (previous) => {
        if (!previous) return previous;

        const list = previous.observations || [];
        const withoutDupes = list.filter(
          (o) =>
            o.id !== formattedObservation.id &&
            o.clientObservationId !== formattedObservation.clientObservationId &&
            !(
              o.productId === formattedObservation.productId &&
              new Date(o.capturedAt).getTime() <=
                new Date(formattedObservation.capturedAt).getTime()
            )
        );

        const nextList = [formattedObservation, ...withoutDupes].sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
        );

        return {
          ...previous,
          observations: nextList,
        };
      });
    },
    [queryClient, queryKey]
  );

  // ────────────────────────────────────────────────────────────
  // Completion detection
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (totalCount > 0 && observedCount >= totalCount && !completionShownRef.current) {
      completionShownRef.current = true;
      setShowCompletionBanner(true);
    }
  }, [observedCount, totalCount]);

  const handleSelectProduct = useCallback((product) => {
    const normalized = product?.productId ? { ...product, id: product.productId } : product;
    // Read from ref, not closure — always freshest
    const existing = observationsByProductRef.current[normalized.id] || null;
    setSelectedProduct({ ...normalized, _existingObservation: existing });
  }, []);

  const handleCancel = useCallback(() => setSelectedProduct(null), []);

  // ────────────────────────────────────────────────────────────
  // performSave — actual work. No closures over stale state.
  // ────────────────────────────────────────────────────────────
  const performSave = useCallback(
    async ({ productId, price, availability }) => {
      // Always read fresh state from refs
      const existing = observationsByProductRef.current[productId];
      const currentAuditStatus = auditStatusRef.current;
      const currentProducts = productsRef.current;

      const isEditableExisting =
        existing && existing.review?.status === "PENDING" && currentAuditStatus === "IN_PROGRESS";

      // ── Update path (PATCH) ────────────────────────────────
      if (isEditableExisting) {
        const optimistic = {
          ...existing,
          availability,
          price: availability === "AVAILABLE" ? price : null,
          capturedAt: new Date().toISOString(),
          sync: { ...(existing.sync || {}), status: "SYNCED" },
        };
        upsertObservationInCache(optimistic);

        try {
          const response = await updateObservation.mutateAsync({
            observationId: existing.id,
            payload: { price, availability },
          });

          const serverObservation = response?.data;
          if (serverObservation) {
            upsertObservationInCache(serverObservation);
          }

          toast.success(
            availability === "AVAILABLE"
              ? `Updated: ${Number(price).toFixed(2)} ETB`
              : `Updated: ${availability.replace("_", " ")}`,
            { id: "observation-toast", duration: 1200 }
          );
          invalidateDependentQueries();
          return;
        } catch (err) {
          upsertObservationInCache(existing);
          toast.error(err?.response?.data?.message || "Unable to update observation");
          return;
        }
      }

      // ── Create path (offline queue) ────────────────────────
      const clientObservationId = buildClientObservationId(auditId, productId);

      const payload = {
        clientObservationId,
        auditId,
        productId,
        availability,
        price: availability === "AVAILABLE" ? price : null,
        observedUnit: existing?.observedUnit || null,
        packageSize: existing?.packageSize || null,
        capturedAt: new Date().toISOString(),
        evidencePhotoUrl: existing?.evidencePhotoUrl || null,
        notes: existing?.notes || null,
      };

      const optimisticObservation = {
        id: clientObservationId,
        clientObservationId,
        auditId,
        productId,
        availability: payload.availability,
        price: payload.price,
        capturedAt: payload.capturedAt,
        sync: { status: "PENDING", attempts: 0 },
        review: { status: "PENDING" },
        product: currentProducts.find((p) => p.id === productId) || undefined,
      };
      upsertObservationInCache(optimisticObservation);

      try {
        const queued = await enqueueObservation(payload);
        const result = await syncObservation(queued);

        if (result.success && result.data) {
          upsertObservationInCache(result.data);
          invalidateDependentQueries();
        } else if (result.permanent) {
          toast.error(
            result.error?.response?.data?.message || "This observation could not be saved"
          );
          queryClient.setQueryData(queryKey, (previous) => {
            if (!previous) return previous;
            return {
              ...previous,
              observations: (previous.observations || []).filter(
                (o) => o.clientObservationId !== clientObservationId
              ),
            };
          });
        } else {
          invalidateDependentQueries();
        }

        toast.success(
          availability === "AVAILABLE"
            ? `${formatProductName(
                currentProducts.find((p) => p.id === productId)?.name || "Item"
              )}: ${Number(price).toFixed(2)} ETB`
            : `${formatProductName(
                currentProducts.find((p) => p.id === productId)?.name || "Item"
              )}: ${availability.replace("_", " ")}`,
          { id: "observation-toast", duration: 1200 }
        );
      } catch (err) {
        queryClient.setQueryData(queryKey, (previous) => {
          if (!previous) return previous;
          return {
            ...previous,
            observations: (previous.observations || []).filter(
              (o) => o.clientObservationId !== clientObservationId
            ),
          };
        });
        toast.error(err?.message || "Unable to save observation locally");
      }
    },
    [
      auditId,
      updateObservation,
      upsertObservationInCache,
      invalidateDependentQueries,
      queryClient,
      queryKey,
    ]
  );

  // ────────────────────────────────────────────────────────────
  // persistObservation — dedupe + serialize
  //
  // 1. If the product is already being saved, REJECT immediately.
  //    This is the hard block that prevents double-Enter.
  // 2. Otherwise add to in-flight set, chain onto save chain,
  //    remove from in-flight set when done.
  // ────────────────────────────────────────────────────────────
  const persistObservation = useCallback(
    ({ productId, price, availability }) => {
      // HARD BLOCK: product already being saved → ignore
      if (inFlightProductsRef.current.has(productId)) {
        toast("Already saving…", { id: "obs-in-flight", duration: 800 });
        return Promise.resolve();
      }

      inFlightProductsRef.current.add(productId);
      setIsSaving(true);

      const run = saveChainRef.current
        .catch(() => {})
        .then(() => performSave({ productId, price, availability }))
        .catch(() => {});

      saveChainRef.current = run;

      run.finally(() => {
        inFlightProductsRef.current.delete(productId);
        // Clear saving flag if nothing else is queued
        if (saveChainRef.current === run && inFlightProductsRef.current.size === 0) {
          setIsSaving(false);
        }
      });

      return run;
    },
    [performSave]
  );

  const handleSavePrice = useCallback(
    ({ productId, price, availability }) => {
      // Immediately close the input so the user can move on.
      // The chain still serializes the actual insert.
      setSelectedProduct(null);
      setFilterMode("PENDING");
      return persistObservation({ productId, price, availability });
    },
    [persistObservation]
  );

  const handleSaveAvailability = useCallback(
    ({ productId, availability, price }) => {
      setSelectedProduct(null);
      setFilterMode("PENDING");
      return persistObservation({ productId, price, availability });
    },
    [persistObservation]
  );

  // ────────────────────────────────────────────────────────────
  // Loading / error states
  // ────────────────────────────────────────────────────────────
  if (auditLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !audit) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">
          {error?.message || "Unable to load observations"}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/audits/${auditId}`)}
          className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
        >
          Back to audit
        </button>
      </div>
    );
  }

  const store = audit.store;
  const auditor = audit.auditor;
  const surveyPeriod = audit.surveyPeriod;

  const pendingProducts = products.filter((p) => !completedIds.has(p.id));
  const completedProducts = products.filter((p) => completedIds.has(p.id));

  const visibleProducts =
    filterMode === "PENDING"
      ? pendingProducts
      : filterMode === "COMPLETED"
        ? completedProducts
        : products;

  if (products.length === 0) {
    return (
      <div className="space-y-4">
        <BackButton navigate={navigate} auditId={auditId} />
        <ObservationEmptyState
          title="No products assigned"
          description="This audit has no products in its assignment."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-24">
      <BackButton navigate={navigate} auditId={auditId} />

      {/* Sticky header */}
      <div className="sticky top-16 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-black text-slate-900">
              {store?.name || "Unknown store"}
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {store?.competitor?.name}
              {store?.area && ` • ${store.area}`}
              {surveyPeriod?.name && ` • ${surveyPeriod.name}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-black tabular-nums text-slate-900">
              {observedCount} / {totalCount}
            </span>
            {auditor && <span className="text-[10px] text-slate-400">{auditor.name}</span>}
            {isSaving && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
                Saving…
              </span>
            )}
          </div>
        </div>
        <div className="mt-2.5">
          <ObservationProgress observed={observedCount} total={totalCount} />
        </div>
      </div>

      {/* Completion banner */}
      {showCompletionBanner && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#017C4D] text-white">
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-[#017C4D]">All products collected</h3>
              <p className="mt-0.5 text-[11px] text-emerald-700">
                {observedCount} of {totalCount} observations recorded.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/audits/${auditId}`)}
              className="shrink-0 rounded-lg bg-[#017C4D] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#015E3A]"
            >
              View audit
            </button>
          </div>
        </div>
      )}

      {/* Fast product search */}
      {!selectedProduct && (
        <FastProductSearch
          products={products}
          completedProductIds={completedIds}
          onSelectProduct={handleSelectProduct}
          disabled={false}
        />
      )}

      {/* Active product — rapid entry */}
      {selectedProduct && (
        <RapidPriceInput
          selectedProduct={selectedProduct}
          onSavePrice={handleSavePrice}
          onSaveAvailability={handleSaveAvailability}
          onCancel={handleCancel}
          isSaving={false}
        />
      )}

      {/* Product list */}
      {!selectedProduct && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Products ({visibleProducts.length})
            </h2>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
              {[
                { key: "PENDING", label: `Pending (${pendingCount})` },
                { key: "COMPLETED", label: `Done (${observedCount})` },
                { key: "ALL", label: `All (${totalCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterMode(tab.key)}
                  className={`rounded-md px-2 py-0.5 transition ${
                    filterMode === tab.key
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto">
            {visibleProducts.map((product) => {
              const obs = observationsByProduct[product.id];
              const isDone = Boolean(obs);
              const isPendingSync =
                obs?.sync?.status === "PENDING" || obs?.sync?.status === "SYNCING";

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg p-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">
                      {formatProductName(product.name)}
                    </span>
                    <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                      {product.barcode || product.sku || product.id}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {isDone ? (
                      <div className="flex items-center gap-1.5">
                        <ObservationAvailabilityBadge availability={obs.availability} />
                        {obs.availability === "AVAILABLE" &&
                          obs.price !== null &&
                          obs.price !== undefined && (
                            <span className="font-mono text-xs font-black text-[#017C4D]">
                              {formatPrice(obs.price)}
                            </span>
                          )}
                        {isPendingSync && (
                          <span
                            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FE7914]"
                            title="Pending sync"
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Pending
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {visibleProducts.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-xs text-slate-400">
                  {filterMode === "PENDING" ? "All products collected" : "No products to show"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BackButton = ({ navigate, auditId }) => (
  <button
    type="button"
    onClick={() => navigate(`/audits/${auditId}`)}
    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
  >
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
    Audit
  </button>
);

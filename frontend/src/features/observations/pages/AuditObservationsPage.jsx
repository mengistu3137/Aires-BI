import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAudit } from "@/features/audits/hooks/useAudit.js";
import { useAuditObservations } from "../hooks/useAuditObservations.js";
import { useUpdateObservation } from "../hooks/useObservationMutations.js";
import { useLocalQueue } from "../hooks/useLocalQueue.js";
import { useAuth } from "@/hooks/useAuth.js";
import { FastProductSearch } from "../components/FastProductSearch.jsx";
import { RapidPriceInput } from "../components/RapidPriceInput.jsx";
import { ObservationProgress } from "../components/ObservationProgress.jsx";
import { ObservationEmptyState } from "../components/ObservationEmptyState.jsx";
import { ObservationAvailabilityBadge } from "../components/ObservationAvailabilityBadge.jsx";
import { ObservationReviewBadge } from "../components/ObservationReviewBadge.jsx";
import { ObservationSyncBadge } from "../components/ObservationSyncBadge.jsx";
import { formatPrice, formatCapturedAt } from "../utils/observation.utils.js";
import { enqueueObservation, syncObservation, flushQueue } from "../offline/observationQueue.js";
import { formatProductName } from "@/utils/formatters.js";

/**
 * Deterministic client observation id — stable across retries.
 */
const buildClientObservationId = (auditId, productId) => `obs_${auditId}_${productId}`;

export const AuditObservationsPage = () => {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const { user, isManager, isAdmin } = useAuth();

  const { data: audit, isLoading: auditLoading } = useAudit(auditId);
  const { data, isLoading, isError, error } = useAuditObservations(auditId);

  const observations = data?.observations || [];
  const store = audit?.store;
  const surveyPeriod = audit?.surveyPeriod;
  const auditor = audit?.auditor;

  const isAssignedAuditor = Boolean(user?.id && audit?.auditor?.id === user.id);
  const isPrivileged = isManager || isAdmin;
  const canCollect = isAssignedAuditor || isPrivileged;

  if (auditLoading || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !audit) {
    return (
      <div className="mx-auto max-w-md px-4 py-8">
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
      </div>
    );
  }

  if (isAssignedAuditor) {
    return <CollectionView audit={audit} observations={observations} auditId={auditId} />;
  }

  if (observations.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 pt-4 sm:px-6">
        <BackButton navigate={navigate} auditId={auditId} />
        <ObservationEmptyState
          title="No observations recorded yet"
          description="The assigned auditor has not recorded any observations for this audit."
        />
      </div>
    );
  }

  return (
    <ReadOnlyObservationsView
      audit={audit}
      observations={observations}
      store={store}
      auditor={auditor}
      surveyPeriod={surveyPeriod}
      auditId={auditId}
    />
  );
};

// ============================================================
// READ-ONLY VIEW (Admin / Manager)
// ============================================================
const ReadOnlyObservationsView = ({
  audit,
  observations,
  store,
  auditor,
  surveyPeriod,
  auditId,
}) => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filterPanelRef = useRef(null);
  const filterButtonRef = useRef(null);

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

  const observedCount = Object.keys(observationsByProduct).length;
  const totalCount = audit?.assignment?.items?.length || observedCount;

  const filteredObservations = useMemo(() => {
    let list = observations;

    if (availability) {
      list = list.filter((o) => o.availability === availability);
    }
    if (reviewStatus) {
      list = list.filter((o) => o.review?.status === reviewStatus);
    }
    if (syncStatus) {
      list = list.filter((o) => o.sync?.status === syncStatus);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter((o) => {
        const name = (o.product?.name || "").toLowerCase();
        const sku = (o.product?.sku || "").toLowerCase();
        const barcode = (o.product?.barcode || "").toLowerCase();
        const category = (o.product?.category || "").toLowerCase();
        const notes = (o.notes || "").toLowerCase();
        return (
          name.includes(term) ||
          sku.includes(term) ||
          barcode.includes(term) ||
          category.includes(term) ||
          notes.includes(term)
        );
      });
    }

    return list;
  }, [observations, availability, reviewStatus, syncStatus, search]);

  const activeFilterCount = [availability, reviewStatus, syncStatus].filter(Boolean).length;
  const hasActiveFilters = Boolean(search.trim() || availability || reviewStatus || syncStatus);

  const clearFilters = () => {
    setSearch("");
    setAvailability("");
    setReviewStatus("");
    setSyncStatus("");
  };

  useEffect(() => {
    if (!isFilterOpen) return;

    const handlePointerDown = (event) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target)
      ) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    if (!isFilterOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setIsFilterOpen(false);
        filterButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isFilterOpen]);

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto max-w-4xl px-3 pt-2.5 sm:px-6 sm:pt-4">
          <BackButton navigate={navigate} auditId={auditId} />

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black text-slate-900 sm:text-lg">
                {store?.name || "Unknown store"}
              </h1>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                {store?.competitor?.name}
                {store?.area && ` • ${store.area}`}
                {surveyPeriod?.name && ` • ${surveyPeriod.name}`}
              </p>
              {auditor && (
                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">
                  Auditor: {auditor.name}
                </p>
              )}
            </div>
            <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Read-only
            </span>
          </div>

          <div className="mt-2.5 pb-2.5 sm:mt-3 sm:pb-3.5">
            <ObservationProgress observed={observedCount} total={totalCount} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl space-y-3 px-3 pt-3 sm:space-y-4 sm:px-6 sm:pt-4">
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU, barcode…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
            />
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              ref={filterButtonRef}
              type="button"
              onClick={() => setIsFilterOpen((s) => !s)}
              className={`flex h-full items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition ${
                hasActiveFilters
                  ? "border-[#A41821] bg-[#A41821] text-white hover:bg-[#7F1219]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              aria-expanded={isFilterOpen}
              aria-haspopup="true"
              aria-controls="observation-filter-panel"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] font-black ${
                    hasActiveFilters ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div
                ref={filterPanelRef}
                id="observation-filter-panel"
                role="dialog"
                aria-label="Observation filters"
                className="absolute right-0 z-30 mt-2 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl sm:w-80"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Filter observations
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close filters"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <FilterSelect
                    label="Availability"
                    value={availability}
                    onChange={setAvailability}
                    options={[
                      { value: "", label: "All availability" },
                      { value: "AVAILABLE", label: "Available" },
                      { value: "OUT_OF_STOCK", label: "Out of stock" },
                      { value: "NOT_FOUND", label: "Not found" },
                    ]}
                  />

                  <FilterSelect
                    label="Review status"
                    value={reviewStatus}
                    onChange={setReviewStatus}
                    options={[
                      { value: "", label: "All review statuses" },
                      { value: "PENDING", label: "Pending" },
                      { value: "APPROVED", label: "Approved" },
                      { value: "REJECTED", label: "Rejected" },
                      { value: "NEEDS_REVIEW", label: "Needs review" },
                    ]}
                  />

                  <FilterSelect
                    label="Sync status"
                    value={syncStatus}
                    onChange={setSyncStatus}
                    options={[
                      { value: "", label: "All sync statuses" },
                      { value: "SYNCED", label: "Synced" },
                      { value: "PENDING", label: "Pending" },
                      { value: "SYNCING", label: "Syncing" },
                      { value: "FAILED", label: "Failed" },
                    ]}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reset all
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="rounded-xl bg-[#A41821] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#7F1219]"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active:
            </span>
            {availability && (
              <FilterChip
                label={`Availability: ${prettyEnum(availability)}`}
                onRemove={() => setAvailability("")}
              />
            )}
            {reviewStatus && (
              <FilterChip
                label={`Review: ${prettyEnum(reviewStatus)}`}
                onRemove={() => setReviewStatus("")}
              />
            )}
            {syncStatus && (
              <FilterChip
                label={`Sync: ${prettyEnum(syncStatus)}`}
                onRemove={() => setSyncStatus("")}
              />
            )}
            {search.trim() && (
              <FilterChip label={`Search: "${search.trim()}"`} onRemove={() => setSearch("")} />
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="ml-1 cursor-pointer text-[11px] font-bold text-[#A41821] hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>
            Showing <span className="font-black text-slate-900">{filteredObservations.length}</span>{" "}
            of {observations.length}
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-700 sm:text-xs">
              Observations ({filteredObservations.length})
            </h2>
            <span className="hidden text-[10px] text-slate-400 sm:inline">
              Tap a row for details
            </span>
          </div>

          {filteredObservations.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-xs font-medium text-slate-500">
                {hasActiveFilters
                  ? "No observations match your filters"
                  : "No observations recorded yet"}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredObservations.map((obs) => (
                <ObservationRow
                  key={obs.id}
                  observation={obs}
                  onClick={() => navigate(`/observations/${obs.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Sub-components
// ============================================================

const FilterSelect = ({ label, value, onChange, options }) => (
  <div>
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pr-9 text-xs font-semibold text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
      >
        {options.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
);

const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
      aria-label={`Remove ${label}`}
    >
      ✕
    </button>
  </span>
);

const ObservationRow = ({ observation, onClick }) => {
  const product = observation.product;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 sm:px-4"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-bold text-slate-900 sm:text-[15px]">
            {formatProductName(product?.name || "Unknown product")}
          </span>
          <ObservationAvailabilityBadge availability={observation.availability} />
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[10px] text-slate-400 sm:text-[11px]">
          <span className="truncate">{product?.barcode || product?.sku || product?.id}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{formatCapturedAt(observation.capturedAt)}</span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <ObservationReviewBadge status={observation.review?.status} />
          <ObservationSyncBadge status={observation.sync?.status} />
          <span className="text-[10px] text-slate-400 sm:hidden">
            {formatCapturedAt(observation.capturedAt)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        {observation.availability === "AVAILABLE" &&
        observation.price !== null &&
        observation.price !== undefined ? (
          <span className="font-mono text-sm font-black text-[#017C4D] sm:text-base">
            {formatPrice(observation.price)}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">
            {prettyEnum(observation.availability) || "—"}
          </span>
        )}
        <svg
          className="mt-1.5 h-4 w-4 text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
};

const prettyEnum = (value) => {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

// ============================================================
// COLLECTION VIEW (assigned auditor)
// ============================================================
const CollectionView = ({ audit, observations, auditId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateObservation = useUpdateObservation();

  // Local offline queue
  const { localObservations } = useLocalQueue(auditId);

  const queryKey = useMemo(() => ["observations", "audit", auditId, {}], [auditId]);

  const products = useMemo(
    () => audit?.assignment?.items?.map((item) => item.product).filter(Boolean) || [],
    [audit]
  );

  // ────────────────────────────────────────────────────────────
  // Merge server + local queue observations.
  //
  // 1. Server rows first, tagged __local: false.
  // 2. Local queue rows only added if the clientObservationId is not
  //    already present from the server (dedupe).
  // 3. Group by productId, keeping the latest capturedAt. On ties,
  //    prefer the non-local (server) record.
  // ────────────────────────────────────────────────────────────
  const observationsByProduct = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const merged = new Map();

    // Server rows. Note: this list can also contain optimistic rows we
    // wrote into the React Query cache ourselves (see upsertObservationInCache),
    // so respect each row's own __local flag instead of forcing it to
    // false — otherwise a still-PENDING offline row briefly reports itself
    // as synced/server-confirmed, which is what made the status appear to
    // "flip" before reverting.
    for (const o of observations) {
      const key = o.clientObservationId || o.id;
      merged.set(key, {
        ...o,
        __local: Boolean(o.__local),
        product: o.product || productMap.get(o.productId),
      });
    }

    // Local queue rows — add only if not already present from server
    for (const o of localObservations) {
      const key = o.clientObservationId || o.id;
      if (!merged.has(key)) {
        merged.set(key, {
          ...o,
          __local: true,
          product: o.product || productMap.get(o.productId),
        });
      }
    }

    // Group by product, keep latest. Tie-break prefers server.
    const byProduct = {};
    for (const o of merged.values()) {
      const existing = byProduct[o.productId];
      if (!existing) {
        byProduct[o.productId] = o;
        continue;
      }

      const oTime = new Date(o.capturedAt).getTime();
      const eTime = new Date(existing.capturedAt).getTime();

      if (oTime > eTime) {
        byProduct[o.productId] = o;
      } else if (oTime === eTime && existing.__local && !o.__local) {
        byProduct[o.productId] = o;
      }
    }

    return byProduct;
  }, [observations, localObservations, products]);

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
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);

  const completionShownRef = useRef(false);
  const inFlightProductsRef = useRef(new Set());
  const saveChainRef = useRef(Promise.resolve());

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

  // The app shell already mounts useObservationQueueFlush (auto-flushes the
  // offline queue on reconnect) and useObservationQueueInvalidator (refetches
  // these queries whenever the queue reports a sync event). So this view
  // does NOT call flushQueue() itself on the "online" event — doing so here
  // too would race the app-shell flush and could double-POST the same
  // pending observation. "Sync now" below is a manual, user-initiated retry
  // only (e.g. the auto-flush was missed while the tab was backgrounded).
  const runQueueFlush = useCallback(async () => {
    setIsSyncingQueue(true);
    try {
      const result = await flushQueue();
      if (result.synced > 0) {
        toast.success(
          `Synced ${result.synced} offline observation${result.synced === 1 ? "" : "s"}`,
          { id: "queue-sync-toast", duration: 2000 }
        );
      }
      if (result.failed > 0) {
        toast.error(
          `${result.failed} offline observation${result.failed === 1 ? "" : "s"} could not be saved`,
          { id: "queue-sync-toast-failed", duration: 3000 }
        );
      }
    } finally {
      setIsSyncingQueue(false);
      invalidateDependentQueries();
    }
  }, [invalidateDependentQueries]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

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
        return { ...previous, observations: nextList };
      });
    },
    [queryClient, queryKey]
  );

  useEffect(() => {
    if (totalCount > 0 && observedCount >= totalCount && !completionShownRef.current) {
      completionShownRef.current = true;
      setShowCompletionBanner(true);
    }
  }, [observedCount, totalCount]);

  const handleSelectProduct = useCallback((product) => {
    const normalized = product?.productId ? { ...product, id: product.productId } : product;
    const existing = observationsByProductRef.current[normalized.id] || null;
    setSelectedProduct({ ...normalized, _existingObservation: existing });
  }, []);

  const handleCancel = useCallback(() => setSelectedProduct(null), []);

  const performSave = useCallback(
    async ({ productId, price, availability }) => {
      const existing = observationsByProductRef.current[productId];
      const currentAuditStatus = auditStatusRef.current;
      const currentProducts = productsRef.current;
      const online = navigator.onLine;

      const productName = formatProductName(
        currentProducts.find((p) => p.id === productId)?.name || "Item"
      );

      // Update server-side directly only when we're online AND the existing
      // row is a server row. If we're offline, an edit to an already-synced
      // row falls through to the offline-queue path below (as an UPDATE)
      // instead of firing a doomed network mutation that fails and reverts
      // the row back to its old value.
      const isServerRow = existing && !existing.__local && existing.review?.status === "PENDING";
      const isEditableExisting = isServerRow && currentAuditStatus === "IN_PROGRESS";

      if (isEditableExisting && online) {
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
          if (response?.data) {
            upsertObservationInCache(response.data);
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

      const clientObservationId = buildClientObservationId(auditId, productId);
      // An offline edit to a row that already exists on the server needs to
      // sync as an UPDATE against that server id, not a new CREATE.
      const isOfflineEditOfServerRow = isEditableExisting && !online;

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
        operation: isOfflineEditOfServerRow ? "UPDATE" : "CREATE",
        serverObservationId: isOfflineEditOfServerRow ? existing.id : null,
      };

      const optimisticObservation = {
        id: isOfflineEditOfServerRow ? existing.id : clientObservationId,
        clientObservationId,
        auditId,
        productId,
        availability: payload.availability,
        price: payload.price,
        capturedAt: payload.capturedAt,
        sync: { status: "PENDING", attempts: 0 },
        review: {
          status: isOfflineEditOfServerRow ? existing.review?.status || "PENDING" : "PENDING",
        },
        product: currentProducts.find((p) => p.id === productId) || undefined,
        __local: true,
      };
      upsertObservationInCache(optimisticObservation);

      try {
        const queued = await enqueueObservation(payload);

        // Offline: stop here. Don't attempt the network call at all — that
        // is exactly what produced the "shows a status, then reverts"
        // behavior (a doomed request that eventually fails and flips the
        // row back). The row stays visibly PENDING/offline until
        // runQueueFlush() pushes it once we're back online.
        if (!online) {
          toast.success(`${productName} saved offline — will sync when online`, {
            id: "observation-toast",
            duration: 1800,
          });
          return;
        }

        const result = await syncObservation(queued);

        if (result.success && result.data) {
          upsertObservationInCache(result.data);
          invalidateDependentQueries();
          toast.success(
            availability === "AVAILABLE"
              ? `${productName}: ${Number(price).toFixed(2)} ETB`
              : `${productName}: ${availability.replace("_", " ")}`,
            { id: "observation-toast", duration: 1200 }
          );
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
          // Transient failure (connection dropped mid-request, etc). Leave
          // it queued as PENDING — the next reconnect flush will retry it.
          toast.success(`${productName} saved offline — will sync when online`, {
            id: "observation-toast",
            duration: 1800,
          });
        }
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

  const persistObservation = useCallback(
    ({ productId, price, availability }) => {
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
      <div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 pt-4 sm:px-6">
        <BackButton navigate={navigate} auditId={auditId} />
        <ObservationEmptyState
          title="No products assigned"
          description="This audit has no products in its assignment."
        />
      </div>
    );
  }

  const pendingSyncCount = localObservations.length;
  // Reflects real progress whether triggered by our own "Sync now" button
  // or by the app shell's automatic reconnect flush.
  const queueIsSyncing =
    isSyncingQueue || localObservations.some((o) => o.sync?.status === "SYNCING");

  return (
    <div className="mx-auto max-w-2xl space-y-3 pb-24">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
          <BackButton navigate={navigate} auditId={auditId} />

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-black text-slate-900 sm:text-lg">
                {store?.name || "Unknown store"}
              </h1>
              <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
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

          <div className="mt-2.5 pb-2.5 sm:mt-3 sm:pb-3.5">
            <ObservationProgress observed={observedCount} total={totalCount} />
          </div>
        </div>
      </div>

      <div className="space-y-3 px-3 pt-3 sm:space-y-4 sm:px-4 sm:pt-4">
        {(!isOnline || pendingSyncCount > 0 || queueIsSyncing) && (
          <div
            className={`rounded-xl border px-3 py-2 text-[11px] ${
              !isOnline
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            {!isOnline ? (
              <p>
                <span className="font-bold">Offline mode:</span>{" "}
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} observation${pendingSyncCount === 1 ? "" : "s"} saved locally. `
                  : ""}
                They will sync automatically when the connection returns.
              </p>
            ) : queueIsSyncing ? (
              <p>
                <span className="font-bold">Syncing…</span> pushing {pendingSyncCount || ""} offline
                observation{pendingSyncCount === 1 ? "" : "s"} now.
              </p>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p>
                  <span className="font-bold">{pendingSyncCount}</span> observation
                  {pendingSyncCount === 1 ? "" : "s"} pending sync.
                </p>
                <button
                  type="button"
                  onClick={runQueueFlush}
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  Sync now
                </button>
              </div>
            )}
          </div>
        )}

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

        {!selectedProduct && (
          <FastProductSearch
            products={products}
            completedProductIds={completedIds}
            onSelectProduct={handleSelectProduct}
            disabled={false}
          />
        )}

        {selectedProduct && (
          <RapidPriceInput
            selectedProduct={selectedProduct}
            onSavePrice={handleSavePrice}
            onSaveAvailability={handleSaveAvailability}
            onCancel={handleCancel}
            isSaving={false}
          />
        )}

        {!selectedProduct && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-700 sm:text-xs">
                Products ({visibleProducts.length})
              </h2>
              <div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
                {[
                  { key: "PENDING", label: `Pending (${pendingCount})` },
                  { key: "COMPLETED", label: `Done (${observedCount})` },
                  { key: "ALL", label: `All (${totalCount})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterMode(tab.key)}
                    className={`shrink-0 rounded-md px-2 py-0.5 transition ${
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
                    className="flex w-full items-center justify-between gap-3 rounded-lg p-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900">
                        {formatProductName(product.name)}
                      </span>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
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
    </div>
  );
};

const BackButton = ({ navigate, auditId }) => (
  <button
    type="button"
    onClick={() => navigate(`/audits/${auditId}`)}
    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
  >
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
    Audit
  </button>
);

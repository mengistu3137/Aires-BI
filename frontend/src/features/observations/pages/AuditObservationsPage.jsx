import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAudit } from "@/features/audits/hooks/useAudit.js";
import { useAuditObservations } from "../hooks/useAuditObservations.js";
import { ObservationsList } from "../components/ObservationsList.jsx";
import { ObservationProgress } from "../components/ObservationProgress.jsx";
import { ObservationForm } from "../components/ObservationForm.jsx";
import { ObservationEmptyState } from "../components/ObservationEmptyState.jsx";

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const AuditObservationsPage = () => {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const [activeProduct, setActiveProduct] = useState(null);

  const { data: audit, isLoading: auditLoading } = useAudit(auditId);
  const { data, isLoading, isError, error } = useAuditObservations(auditId);

  const observations = data?.observations || [];
  const meta = data?.meta;
  const completeness = meta?.completeness;

  const products = useMemo(() => {
    return audit?.assignment?.items?.map((item) => item.product).filter(Boolean) || [];
  }, [audit]);

  const observedCount = completeness?.observedProductsCount ?? 0;
  const totalCount = completeness?.expectedProductsCount ?? products.length;

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

  // Show observation form
  if (activeProduct) {
    const existingObservation = observations.find((o) => o.productId === activeProduct.id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveProduct(null)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to products
          </button>
        </div>
        <ObservationForm
          auditId={auditId}
          product={activeProduct}
          existingObservation={existingObservation}
          onSaved={() => setActiveProduct(null)}
          onCancel={() => setActiveProduct(null)}
        />
      </div>
    );
  }

  const auditor = audit.auditor;
  const store = audit.store;
  const surveyPeriod = audit.surveyPeriod;
  const gps = audit.gps;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(`/audits/${auditId}`)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Audit
        </button>
      </div>

      {/* Audit context — store + competitor + survey period + auditor + GPS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h1 className="text-base font-black text-slate-800">{store?.name || "Unknown store"}</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {store?.competitor?.name}
          {store?.city && ` · ${store.city}`}
          {store?.area && ` · ${store.area}`}
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {auditor && (
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Auditor
              </p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-slate-700">{auditor.name}</p>
              <p className="text-[10px] text-slate-400">
                {auditor.role === "FIELD_AUDITOR"
                  ? "Field Auditor"
                  : auditor.role === "MANAGER"
                    ? "Pricing Manager"
                    : "Administrator"}
              </p>
            </div>
          )}
          {surveyPeriod && (
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Survey period
              </p>
              <p className="mt-0.5 truncate text-[11px] font-bold text-slate-700">
                {surveyPeriod.name}
              </p>
              <p className="text-[10px] text-slate-400">
                {formatDate(surveyPeriod.startDate)} → {formatDate(surveyPeriod.endDate)}
              </p>
            </div>
          )}
        </div>

        {/* GPS verification */}
        {gps && (gps.start || gps.end) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {gps.gpsValid === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#017C4D]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#017C4D]" />
                Location verified
              </span>
            )}
            {gps.gpsValid === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FE7914]" />
                Outside radius
              </span>
            )}
            {gps.distanceFromStoreMeters !== null && gps.distanceFromStoreMeters !== undefined && (
              <span className="text-[11px] text-slate-500">
                Distance: {Math.round(gps.distanceFromStoreMeters)}m
              </span>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="mt-4">
          <ObservationProgress observed={observedCount} total={totalCount} />
        </div>

        {/* Missing products summary */}
        {completeness?.missingProductsCount > 0 && completeness.missingProducts && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
              {completeness.missingProductsCount} product
              {completeness.missingProductsCount === 1 ? "" : "s"} still missing
            </p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-amber-700">
              {completeness.missingProducts.map((p) => p.name || p.productId).join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* Product list */}
      {products.length === 0 ? (
        <ObservationEmptyState
          title="No products assigned"
          description="This audit has no products in its assignment."
        />
      ) : (
        <ObservationsList
          products={products}
          observations={observations}
          onSelectProduct={setActiveProduct}
        />
      )}
    </div>
  );
};

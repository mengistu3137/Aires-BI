import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAudit } from "@/features/audits/hooks/useAudit.js";
import { useAuditObservations } from "../hooks/useAuditObservations.js";
import { ObservationsList } from "../components/ObservationsList.jsx";
import { ObservationProgress } from "../components/ObservationProgress.jsx";
import { ObservationForm } from "../components/ObservationForm.jsx";
import { ObservationEmptyState } from "../components/ObservationEmptyState.jsx";

export const AuditObservationsPage = () => {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const [activeProduct, setActiveProduct] = useState(null);

  const { data: audit, isLoading: auditLoading } = useAudit(auditId);
  const { data, isLoading, isError, error } = useAuditObservations(auditId);

  const observations = data?.observations || [];
  const meta = data?.meta;
  const completeness = meta?.completeness;

  // Build assigned product list from audit
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

      {/* Audit context */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h1 className="text-base font-black text-slate-800">{audit.store?.name}</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {audit.store?.competitor?.name}
          {audit.store?.city && ` · ${audit.store.city}`}
        </p>
        <div className="mt-4">
          <ObservationProgress observed={observedCount} total={totalCount} />
        </div>
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

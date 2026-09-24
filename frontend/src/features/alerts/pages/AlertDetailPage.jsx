import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAlert } from "../hooks/useAlert.js";
import { useResolveAlert } from "../hooks/useAlertMutations.js";
import { useAuth } from "@/hooks/useAuth.js";
import { AlertSeverityBadge } from "../components/AlertSeverityBadge.jsx";
import { AlertTypeBadge } from "../components/AlertTypeBadge.jsx";
import { AlertStatusBadge } from "../components/AlertStatusBadge.jsx";
import { AlertPriceSummary } from "../components/AlertPriceSummary.jsx";
import { AlertProductContext } from "../components/AlertProductContext.jsx";
import { AlertResolutionSection } from "../components/AlertResolutionSection.jsx";
import { AlertResolveModal } from "../components/AlertResolveModal.jsx";
import { formatDateTime } from "../utils/alert.utils.js";

export const AlertDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveError, setResolveError] = useState(null);

  const { data: alert, isLoading, isError, error } = useAlert(id);
  const resolveMutation = useResolveAlert();

  const handleResolve = async ({ resolutionNote }) => {
    setResolveError(null);
    try {
      await resolveMutation.mutateAsync({
        id,
        payload: { resolutionNote },
      });
      setShowResolveModal(false);
    } catch (err) {
      setResolveError(
        err?.response?.data?.message || err?.message || "Unable to resolve this alert"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !alert) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">{error?.message || "Alert not found"}</p>
        <button
          type="button"
          onClick={() => navigate("/alerts")}
          className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
        >
          Back to alerts
        </button>
      </div>
    );
  }

  const canResolve = isManager && !alert.resolved;

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-slate-800">
              {alert.product?.name || "Unknown product"}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {alert.product?.category}
              {alert.product?.sku && ` · SKU ${alert.product.sku}`}
            </p>
          </div>
          <AlertSeverityBadge severity={alert.severity} size="md" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AlertTypeBadge type={alert.type} />
          <AlertStatusBadge resolved={alert.resolved} size="md" />
          <span className="ml-auto text-[11px] text-slate-400">
            {formatDateTime(alert.createdAt)}
          </span>
        </div>
      </div>

      {/* Message */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Alert message
        </p>
        <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{alert.message}</p>
      </div>

      {/* Price summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Price information
        </h2>
        <div className="mt-2">
          <AlertPriceSummary alert={alert} />
        </div>
      </div>

      {/* Product + survey period context */}
      <AlertProductContext alert={alert} />

      {/* Resolution section (only when resolved) */}
      <AlertResolutionSection alert={alert} />

      {/* Related actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Related</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {alert.productId && (
            <button
              type="button"
              onClick={() => navigate(`/products/${alert.productId}/queens-prices`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Queens price history
            </button>
          )}
          {alert.productId && alert.surveyPeriodId && (
            <button
              type="button"
              onClick={() => navigate(`/price-analysis?surveyPeriodId=${alert.surveyPeriodId}`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Price analysis
            </button>
          )}
          {alert.productId && (
            <button
              type="button"
              onClick={() => navigate(`/products/${alert.productId}`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Product details
            </button>
          )}
        </div>
      </div>

      {/* Resolve action */}
      {canResolve && (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
            <button
              type="button"
              onClick={() => setShowResolveModal(true)}
              className="w-full rounded-xl bg-[#017C4D] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#015E3A]"
            >
              Resolve alert
            </button>
          </div>
        </div>
      )}

      {/* Resolve modal */}
      <AlertResolveModal
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setResolveError(null);
        }}
        onSubmit={handleResolve}
        isPending={resolveMutation.isPending}
        error={resolveError}
      />
    </div>
  );
};

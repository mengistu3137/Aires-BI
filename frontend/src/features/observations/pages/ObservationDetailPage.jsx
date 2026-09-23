import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useObservation } from "../hooks/useObservation.js";
import {
  getAvailabilityBadgeLabel,
  getAvailabilityColors,
  formatPrice,
  formatCapturedAt,
} from "../utils/observation.utils.js";
import { ObservationSyncBadge } from "../components/ObservationSyncBadge.jsx";
import { ObservationReviewBadge } from "../components/ObservationReviewBadge.jsx";

export const ObservationDetailPage = () => {
  const { observationId } = useParams();
  const navigate = useNavigate();
  const { data: observation, isLoading, isError, error } = useObservation(observationId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !observation) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">
          {error?.message || "Observation not found"}
        </p>
      </div>
    );
  }

  const colors = getAvailabilityColors(observation.availability);

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

      {/* Product + status */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h1 className="text-base font-black text-slate-800">{observation.product?.name}</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {observation.product?.category}
          {observation.product?.sku && ` · SKU ${observation.product.sku}`}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
            {getAvailabilityBadgeLabel(observation.availability)}
          </span>
          <ObservationSyncBadge status={observation.sync?.status || "SYNCED"} />
          <ObservationReviewBadge status={observation.review?.status} />
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Price" value={formatPrice(observation.price)} />
          <DetailRow label="Observed unit" value={observation.observedUnit || "—"} />
          <DetailRow label="Package size" value={observation.packageSize || "—"} />
          <DetailRow label="Captured at" value={formatCapturedAt(observation.capturedAt)} />
          <DetailRow label="Store" value={observation.audit?.store?.name || "—"} />
          <DetailRow label="Auditor" value={observation.auditor?.name || "—"} />
          {observation.notes && <DetailRow label="Notes" value={observation.notes} />}
          {observation.review?.reviewNote && (
            <DetailRow label="Review note" value={observation.review.reviewNote} />
          )}
        </dl>
      </div>

      {/* Evidence */}
      {observation.evidencePhotoUrl && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Evidence</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
            <img
              src={observation.evidencePhotoUrl}
              alt="Evidence"
              className="w-full object-cover"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2.5">
    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
    <dd className="text-right text-xs font-semibold text-slate-700">{value}</dd>
  </div>
);

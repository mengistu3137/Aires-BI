import React from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice, formatCapturedAt } from "../utils/observation.utils.js";
import { ObservationAvailabilityBadge } from "./ObservationAvailabilityBadge.jsx";
import { ObservationSyncBadge } from "./ObservationSyncBadge.jsx";
import { ObservationReviewBadge } from "./ObservationReviewBadge.jsx";

export const ObservationCard = ({ observation }) => {
  const navigate = useNavigate();
  const product = observation?.product;
  const store = observation?.audit?.store;
  const auditor = observation?.auditor;

  return (
    <button
      type="button"
      onClick={() => navigate(`/observations/${observation.id}`)}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">
            {product?.name || "Unknown product"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {store?.name}
            {store?.competitor?.name && ` • ${store.competitor.name}`}
          </p>
          {auditor?.name && (
            <p className="mt-0.5 text-[11px] text-slate-400">Auditor: {auditor.name}</p>
          )}
        </div>
        <ObservationAvailabilityBadge availability={observation.availability} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-800">
            {formatPrice(observation.price)}
          </span>
          <ObservationReviewBadge status={observation.review?.status} />
        </div>
        <ObservationSyncBadge status={observation.sync?.status} />
      </div>

      <p className="mt-2 text-[10px] text-slate-400">{formatCapturedAt(observation.capturedAt)}</p>
    </button>
  );
};

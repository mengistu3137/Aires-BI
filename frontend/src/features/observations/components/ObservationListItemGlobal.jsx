import React from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice, formatCapturedAt } from "../utils/observation.utils.js";
import { ObservationAvailabilityBadge } from "./ObservationAvailabilityBadge.jsx";
import { ObservationReviewBadge } from "./ObservationReviewBadge.jsx";
import { ObservationSyncBadge } from "./ObservationSyncBadge.jsx";
import { formatProductName } from "@/utils/formatters.js";

export const ObservationListItemGlobal = ({ observation }) => {
  const navigate = useNavigate();
  const product = observation.product;
  const store = observation.audit?.store;
  const auditor = observation.auditor;

  return (
    <button
      type="button"
      onClick={() => navigate(`/observations/${observation.id}`)}
      className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">
            {formatProductName(product?.name) || "Unknown product"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {product?.category}
            {product?.sku && ` · SKU ${product.sku}`}
          </p>
        </div>
        <ObservationAvailabilityBadge availability={observation.availability} />
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50/70 px-2 py-2 text-[11px]">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Store</p>
          <p className="mt-0.5 truncate font-semibold text-slate-700">{store?.name || "—"}</p>
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Auditor</p>
          <p className="mt-0.5 truncate font-semibold text-slate-700">{auditor?.name || "—"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-800">
            {formatPrice(observation.price)}
          </span>
          <ObservationReviewBadge status={observation.review?.status} />
          <ObservationSyncBadge status={observation.sync?.status} />
        </div>
        <span className="text-[10px] text-slate-400">
          {formatCapturedAt(observation.capturedAt)}
        </span>
      </div>
    </button>
  );
};

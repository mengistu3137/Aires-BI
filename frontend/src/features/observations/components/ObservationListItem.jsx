import React from "react";
import {
  getAvailabilityColors,
  getAvailabilityBadgeLabel,
  formatPrice,
} from "../utils/observation.utils.js";
import { ObservationSyncBadge } from "./ObservationSyncBadge.jsx";

export const ObservationListItem = ({ product, observation, onSelect }) => {
  const isObserved = Boolean(observation);
  const colors = observation ? getAvailabilityColors(observation.availability) : null;

  const syncStatus = observation?.sync?.status || observation?.syncStatus || "SYNCED";

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          isObserved ? colors.bg : "bg-slate-100"
        }`}
      >
        {isObserved ? (
          <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
        ) : (
          <svg
            className="h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-800">{product.name}</p>
          {product.required && !isObserved && (
            <span className="shrink-0 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#FE7914]">
              Required
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {product.sku ? `SKU ${product.sku}` : product.category}
          {product.unit && ` · ${product.unit}`}
        </p>

        {isObserved && (
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}
            >
              {getAvailabilityBadgeLabel(observation.availability)}
            </span>
            {observation.price !== null && observation.price !== undefined && (
              <span className="text-[11px] font-bold text-slate-700">
                {formatPrice(observation.price)}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0">
        {isObserved ? (
          <ObservationSyncBadge status={syncStatus} />
        ) : (
          <svg
            className="h-4 w-4 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </div>
    </button>
  );
};

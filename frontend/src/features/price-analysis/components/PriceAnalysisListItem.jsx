import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate, formatIndex, formatPrice } from "../utils/price-analysis.utils.js";
import { PriceAnalysisActionBadge } from "./PriceAnalysisActionBadge.jsx";

/**
 * Mobile-optimized list item for a price analysis.
 * Compact layout — not a large card.
 */
export const PriceAnalysisListItem = ({ analysis }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/price-analysis/${analysis.id}`)}
      className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
    >
      {/* Header: product + action */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">
            {analysis.product?.name || "Unknown product"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {analysis.product?.category}
            {analysis.product?.sku && ` · SKU ${analysis.product.sku}`}
          </p>
        </div>
        <PriceAnalysisActionBadge action={analysis.action} />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-50/70 px-2 py-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Queens</p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-700">
            {formatPrice(analysis.queensPrice)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Avg comp.</p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-700">
            {formatPrice(analysis.competitorAveragePrice)}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Index</p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-700">
            {formatIndex(analysis.priceIndex)}
          </p>
        </div>
      </div>

      {/* Footer: period + date */}
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span className="truncate">{analysis.surveyPeriod?.name}</span>
        <span className="shrink-0">{formatDate(analysis.calculatedAt)}</span>
      </div>
    </button>
  );
};

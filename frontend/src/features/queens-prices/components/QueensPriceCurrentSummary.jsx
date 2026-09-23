import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate, formatPrice } from "../utils/queens-price.utils.js";

/**
 * Compact current-price summary block.
 * Used on product history pages and product detail pages.
 */
export const QueensPriceCurrentSummary = ({
  product,
  currentPrice,
  historyCount,
  onAdd,
  className = "",
}) => {
  const navigate = useNavigate();

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-xs ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Current Queens price
          </p>
          {currentPrice ? (
            <>
              <p className="mt-1 text-2xl font-black text-slate-800">
                {formatPrice(currentPrice.price)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Effective since {formatDate(currentPrice.effectiveFrom)}
              </p>
              {historyCount !== undefined && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {historyCount} price period{historyCount === 1 ? "" : "s"} in history
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mt-1 text-sm font-semibold text-slate-500">No active Queens price</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Add a benchmark price to enable price analysis.
              </p>
            </>
          )}
        </div>
      </div>

      {onAdd && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#A41821] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Queens price
          </button>
        </div>
      )}
    </div>
  );
};

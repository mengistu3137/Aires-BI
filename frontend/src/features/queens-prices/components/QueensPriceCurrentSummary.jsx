import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate, formatPrice } from "../utils/queens-price.utils.js";

/**
 * Compact current-price summary block.
 * Adheres to Aires-BI typography & brand standards.
 */
export const QueensPriceCurrentSummary = ({
  product,
  currentPrice,
  historyCount,
  onAdd,
  className = "",
}) => {
  const navigate = useNavigate();

  // Authoritative fallback navigation: guards against passing undefined string
  const handleAdd = () => {
    if (typeof onAdd === "function") {
      onAdd();
      return;
    }
    const targetId = product?.id?.trim();
    if (targetId && targetId !== "undefined" && targetId !== "null") {
      navigate(`/queens-prices/new?productId=${encodeURIComponent(targetId)}`);
    } else {
      navigate("/queens-prices/new");
    }
  };

  const hasValidProduct = Boolean(product?.id && product.id !== "undefined");

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Micro-label: UPPERCASE with letter spacing */}
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Current Queens Benchmark</span>
            {product?.category && (
              <>
                <span>•</span>
                <span>{product.category}</span>
              </>
            )}
          
          </div>

          {currentPrice ? (
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-slate-900">
                  {formatPrice(currentPrice.price)}
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#017C4D] border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Effective since {formatDate(currentPrice.effectiveFrom)}
              </p>
              {historyCount !== undefined && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {historyCount} benchmark period{historyCount === 1 ? "" : "s"} in historical record
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-sm font-bold text-slate-700">No active benchmark price</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Add an official Queen's supermarket benchmark price to enable competitor index analysis.
              </p>
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="flex-none">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!hasValidProduct && !onAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Queens Price
          </button>
        </div>
      </div>
    </div>
  );
};
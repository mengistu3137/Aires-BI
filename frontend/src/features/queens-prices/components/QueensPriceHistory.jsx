import React from "react";
import { QueensPriceHistoryItem } from "./QueensPriceHistoryItem.jsx";
import { QueensPriceEmptyState } from "./QueensPriceEmptyState.jsx";

/**
 * Reusable Queens price history timeline.
 * Can be embedded in Product Details, Queens Prices page, or Product History page.
 */
export const QueensPriceHistory = ({
  prices = [],
  isLoading = false,
  isError = false,
  error,
  onAdd,
  emptyDescription = "No price history has been recorded for this product yet.",
  showHeader = true,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="text-xs font-medium text-[#A41821]">
          {error?.message || "Unable to load price history"}
        </p>
      </div>
    );
  }

  if (prices.length === 0) {
    return (
      <QueensPriceEmptyState
        title="No price history yet"
        description={emptyDescription}
        action={
          onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219]"
            >
              Add Queens price
            </button>
          ) : null
        }
      />
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Price history
          </h2>
          <span className="text-[11px] text-slate-400">
            {prices.length} period{prices.length === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div className="space-y-3">
        {prices.map((price, idx) => (
          <QueensPriceHistoryItem key={price.id} price={price} isLast={idx === prices.length - 1} />
        ))}
      </div>
    </div>
  );
};

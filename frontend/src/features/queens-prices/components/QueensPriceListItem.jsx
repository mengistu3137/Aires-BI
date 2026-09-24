import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDateRange, formatPrice, getQueensPriceStatus } from "../utils/queens-price.utils.js";
import { QueensPriceStatusBadge } from "./QueensPriceStatusBadge.jsx";
import { formatProductName } from "@/utils/formatters.js";

/**
 * Mobile list item for a Queens price record.
 * Compact row layout — not a large card.
 */
export const QueensPriceListItem = ({ price }) => {
  const navigate = useNavigate();
  const status = getQueensPriceStatus(price);

  return (
    <button
      type="button"
      onClick={() => navigate(`/queens-prices/${price.id}`)}
      className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-bold text-slate-800">
            {formatProductName(price.product?.name) || "Unknown product"}
          </p>
          <QueensPriceStatusBadge status={status} />
        </div>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {price.product?.category}
          {price.product?.sku && ` · SKU ${price.product.sku}`}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="text-sm font-black text-slate-800">{formatPrice(price.price)}</span>
          <span className="text-[11px] font-medium text-slate-500">
            {formatDateRange(price.effectiveFrom, price.effectiveTo)}
          </span>
        </div>
        {price.source && <p className="mt-1 text-[11px] text-slate-400">Source: {price.source}</p>}
      </div>
      <svg
        className="mt-1 h-4 w-4 shrink-0 text-slate-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};

import React from "react";
import { formatDateRange, formatPrice, getQueensPriceStatus } from "../utils/queens-price.utils.js";
import { QueensPriceStatusBadge } from "./QueensPriceStatusBadge.jsx";

export const QueensPriceHistoryItem = ({ price, isLast = false }) => {
  const status = getQueensPriceStatus(price);

  return (
    <div className="relative pl-8">
      {/* Timeline dot */}
      <span
        className={`absolute left-2.5 top-4 h-2.5 w-2.5 rounded-full ring-4 ring-white ${
          status === "CURRENT"
            ? "bg-[#017C4D]"
            : status === "FUTURE"
              ? "bg-blue-500"
              : "bg-slate-300"
        }`}
      />
      {/* Timeline line */}
      {!isLast && <span className="absolute left-[13px] top-6 h-full w-px bg-slate-200" />}

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-slate-800">{formatPrice(price.price)}</p>
              <QueensPriceStatusBadge status={status} />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {formatDateRange(price.effectiveFrom, price.effectiveTo)}
            </p>
            {price.source && (
              <p className="mt-1 text-[11px] text-slate-400">Source: {price.source}</p>
            )}
            {price.notes && <p className="mt-1 text-[11px] text-slate-500">{price.notes}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

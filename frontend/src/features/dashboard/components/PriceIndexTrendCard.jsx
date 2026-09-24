import React from "react";
import { formatIndex, formatDate } from "../utils/dashboard.utils.js";

/**
 * Historical average price index across survey periods.
 * Data comes from backend `priceTrend` — already sorted by startDate asc.
 */
export const PriceIndexTrendCard = ({ priceTrend = [] }) => {
  if (priceTrend.length === 0) return null;

  const maxIndex = Math.max(...priceTrend.map((t) => t.averagePriceIndex ?? 0), 100);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        Average price index trend
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Weighted average price index per survey period.
      </p>

      <div className="mt-4 space-y-3">
        {priceTrend.map((point) => {
          const pct =
            maxIndex > 0 ? Math.round(((point.averagePriceIndex ?? 0) / maxIndex) * 100) : 0;
          return (
            <div key={point.surveyPeriodId}>
              <div className="flex items-center justify-between text-[10px]">
                <span className="truncate font-semibold text-slate-600">
                  {point.surveyPeriodName}
                </span>
                <span className="ml-2 shrink-0 font-black text-slate-800">
                  {formatIndex(point.averagePriceIndex)}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#A41821] transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[9px] text-slate-400">
                <span>{formatDate(point.startDate)}</span>
                <span>{point.analysesCount} analyses</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

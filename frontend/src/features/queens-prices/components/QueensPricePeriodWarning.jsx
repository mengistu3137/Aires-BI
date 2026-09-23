import React from "react";
import { formatDateRange } from "../utils/queens-price.utils.js";

/**
 * Warning shown when the candidate effective dates overlap with an existing period.
 * Purely advisory — the backend remains authoritative.
 */
export const QueensPricePeriodWarning = ({ overlappingPeriod }) => {
  if (!overlappingPeriod) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-start gap-2">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-[#FE7914]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[#FE7914]">
            This date range overlaps an existing Queens price period.
          </p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            Existing period:{" "}
            {formatDateRange(overlappingPeriod.effectiveFrom, overlappingPeriod.effectiveTo)}
          </p>
        </div>
      </div>
    </div>
  );
};

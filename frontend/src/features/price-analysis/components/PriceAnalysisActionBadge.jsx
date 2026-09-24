import React from "react";
import { getActionBadgeLabel, getActionColors } from "../utils/price-analysis.utils.js";

/**
 * Presentational badge for a PriceAnalysis record's PriceAction.
 *
 * Pure UI component — receives `action` as a prop and renders a
 * label/color. Does not fetch, mutate, or import any API functions.
 *
 * UPPERCASE label is intentional — short status metadata.
 */
export const PriceAnalysisActionBadge = ({ action, size = "sm" }) => {
  // Null action: neutral placeholder
  if (action === null || action === undefined) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        —
      </span>
    );
  }

  const colors = getActionColors(action);
  const label = getActionBadgeLabel(action);
  const sizeClasses = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
};

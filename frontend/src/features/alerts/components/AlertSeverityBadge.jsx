import React from "react";
import { getSeverityBadgeLabel, getSeverityColors } from "../utils/alert.utils.js";

/**
 * Presentational badge for alert severity.
 * UPPERCASE label — short status metadata.
 */
export const AlertSeverityBadge = ({ severity, size = "sm" }) => {
  if (!severity) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        —
      </span>
    );
  }

  const colors = getSeverityColors(severity);
  const label = getSeverityBadgeLabel(severity);
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

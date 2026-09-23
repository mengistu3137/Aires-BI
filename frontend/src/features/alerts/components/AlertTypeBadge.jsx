import React from "react";
import { getAlertTypeBadgeLabel, getAlertTypeColors } from "../utils/alert.utils.js";

export const AlertTypeBadge = ({ type }) => {
  if (!type) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        —
      </span>
    );
  }

  const colors = getAlertTypeColors(type);
  const label = getAlertTypeBadgeLabel(type);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
};

import React from "react";
import { getStatusBadgeLabel, getStatusColors } from "../utils/alert.utils.js";

export const AlertStatusBadge = ({ resolved, size = "sm" }) => {
  const colors = getStatusColors(resolved);
  const label = getStatusBadgeLabel(resolved);
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

import React from "react";
import { getStatusBadgeLabel, getStatusColors } from "../utils/queens-price.utils.js";

export const QueensPriceStatusBadge = ({ status, showDot = true }) => {
  const colors = getStatusColors(status);
  const label = getStatusBadgeLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text}`}
    >
      {showDot && <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />}
      {label}
    </span>
  );
};

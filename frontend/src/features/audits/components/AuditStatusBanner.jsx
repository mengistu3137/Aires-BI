import React from "react";
import { getStatusColors, getStatusLabel } from "../utils/audit.utils.js";

export const AuditStatusBanner = ({ status, className = "" }) => {
  const colors = getStatusColors(status);

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${colors.bg} ${colors.border} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
      <span className={`text-xs font-bold uppercase tracking-wide ${colors.text}`}>
        {getStatusLabel(status)}
      </span>
    </div>
  );
};

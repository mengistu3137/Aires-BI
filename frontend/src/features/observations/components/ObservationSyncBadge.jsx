import React from "react";
import { getSyncStatusColors, getSyncStatusLabel } from "../utils/observation.utils.js";

export const ObservationSyncBadge = ({ status }) => {
  const colors = getSyncStatusColors(status);
  const label = getSyncStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${colors.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
      {label}
    </span>
  );
};

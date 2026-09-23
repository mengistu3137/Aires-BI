import React from "react";
import { getReviewStatusColors, getReviewStatusLabel } from "../utils/observation.utils.js";

export const ObservationReviewBadge = ({ status }) => {
  const colors = getReviewStatusColors(status);
  const label = getReviewStatusLabel(status);

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text}`}
    >
      {label}
    </span>
  );
};

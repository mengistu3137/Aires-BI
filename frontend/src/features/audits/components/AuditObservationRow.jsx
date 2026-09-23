import React from "react";
import { formatDateTime } from "../utils/audit.utils.js";

export const AuditObservationRow = ({ observation }) => {
  const getAvailabilityBadge = () => {
    switch (observation.availability) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#017C4D]">
            Available
          </span>
        );
      case "OUT_OF_STOCK":
        return (
          <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-[#A41821]">
            Out of Stock
          </span>
        );
      case "NOT_FOUND":
        return (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            Not Found
          </span>
        );
      default:
        return null;
    }
  };

  const getSyncBadge = () => {
    switch (observation.syncStatus) {
      case "SYNCED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#017C4D]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#017C4D]" />
            Synced
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#FE7914]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FE7914] animate-pulse" />
            Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#A41821]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#A41821]" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-xs font-bold text-slate-800">
            {observation.product?.name || "Unknown Product"}
          </p>
          {getAvailabilityBadge()}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
          <span>{formatDateTime(observation.capturedAt)}</span>
          {observation.price && (
            <span className="font-semibold text-slate-600">{observation.price} ETB</span>
          )}
        </div>
      </div>
      {getSyncBadge()}
    </div>
  );
};

import React from "react";
import { formatDistance, getGPSStatusMessage } from "../utils/audit.utils.js";

export const AuditGPSStatus = ({ audit, className = "" }) => {
  const gps = audit?.gps;
  const hasGPS = gps?.start;
  const isValid = gps?.gpsValid === true;
  const isNull = gps?.gpsValid === null;

  const getIcon = () => {
    if (!hasGPS) {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      );
    }
    if (isValid) {
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  };

  const getColorClasses = () => {
    if (!hasGPS || isNull) {
      return "bg-slate-50 border-slate-200 text-slate-600";
    }
    if (isValid) {
      return "bg-emerald-50 border-emerald-200 text-[#017C4D]";
    }
    return "bg-amber-50 border-amber-200 text-[#FE7914]";
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${getColorClasses()} ${className}`}
    >
      {getIcon()}
      <span>{getGPSStatusMessage(audit)}</span>
      {hasGPS && gps.distanceFromStoreMeters !== null && (
        <span className="ml-1 opacity-70">({formatDistance(gps.distanceFromStoreMeters)})</span>
      )}
    </div>
  );
};

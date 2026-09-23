import React from "react";
import { useNavigate } from "react-router-dom";
import { AuditStatusBanner } from "./AuditStatusBanner.jsx";
import {
  formatRelativeTime,
  formatDistance,
  calculateAuditProgress,
} from "../utils/audit.utils.js";

export const AuditCard = ({ audit }) => {
  const navigate = useNavigate();
  const progress = calculateAuditProgress(audit);
  const store = audit?.store;
  const competitor = store?.competitor;

  return (
    <button
      type="button"
      onClick={() => navigate(`/audits/${audit.id}`)}
      className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-800">
              {store?.name || "Unknown Store"}
            </h3>
            {competitor && (
              <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {competitor.name}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {store?.address || store?.city || "No address"}
          </p>
        </div>
        <AuditStatusBanner status={audit.status} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{formatRelativeTime(audit.createdAt)}</span>
        </div>

        {audit.gps?.distanceFromStoreMeters !== null && (
          <div className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            <span>{formatDistance(audit.gps.distanceFromStoreMeters)}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span>{audit.observationsCount || 0} observations</span>
        </div>
      </div>

      {/* Progress bar */}
      {(audit.status === "IN_PROGRESS" || audit.status === "NOT_STARTED") && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#A41821] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
};

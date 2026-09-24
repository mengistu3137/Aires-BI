import React from "react";
import { useNavigate } from "react-router-dom";
import { AuditStatusBanner } from "./AuditStatusBanner.jsx";
import {
  formatRelativeTime,
  formatDistance,
  calculateAuditProgress,
} from "../utils/audit.utils.js";

/**
 * Rich audit card used on the list and history pages.
 * Shows auditor, store, survey period, progress, timing and GPS status.
 */
export const AuditCard = ({ audit }) => {
  const navigate = useNavigate();
  const progress = calculateAuditProgress(audit);

  const store = audit?.store;
  const competitor = store?.competitor;
  const auditor = audit?.auditor;
  const surveyPeriod = audit?.surveyPeriod;
  const gps = audit?.gps;

  return (
    <button
      type="button"
      onClick={() => navigate(`/audits/${audit.id}`)}
      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-slate-300 hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
    >
      {/* Row 1: store name + competitor + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-800">
              {store?.name || "Unknown store"}
            </h3>
            {competitor && (
              <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {competitor.name}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {[store?.area, store?.city].filter(Boolean).join(", ") ||
              store?.address ||
              "No location"}
          </p>
        </div>
        <AuditStatusBanner status={audit.status} />
      </div>

      {/* Row 2: Auditor + Survey period */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {auditor && (
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Auditor</p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-700">{auditor.name}</p>
            <p className="text-[10px] text-slate-400">
              {auditor.role === "FIELD_AUDITOR"
                ? "Field Auditor"
                : auditor.role === "MANAGER"
                  ? "Pricing Manager"
                  : "Administrator"}
            </p>
          </div>
        )}
        {surveyPeriod && (
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Survey period
            </p>
            <p className="mt-0.5 truncate text-[11px] font-bold text-slate-700">
              {surveyPeriod.name}
            </p>
            <p className="text-[10px] text-slate-400">{surveyPeriod.status}</p>
          </div>
        )}
      </div>

      {/* Row 3: meta strip (created, observations, distance) */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {formatRelativeTime(audit.createdAt)}
        </span>

        {gps?.distanceFromStoreMeters !== null && gps?.distanceFromStoreMeters !== undefined && (
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            {formatDistance(gps.distanceFromStoreMeters)}
          </span>
        )}

        <span className="flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          {audit.observationsCount || 0} observation
          {audit.observationsCount === 1 ? "" : "s"}
        </span>

        {gps?.gpsValid === false && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
            Outside radius
          </span>
        )}
        {gps?.gpsValid === true && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#017C4D]">
            Location verified
          </span>
        )}
      </div>

      {/* Row 4: progress bar for in-flight audits */}
      {(audit.status === "IN_PROGRESS" || audit.status === "NOT_STARTED") && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>Collection progress</span>
            <span className="font-bold text-slate-600">{progress}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 100 ? "bg-[#017C4D]" : "bg-[#A41821]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
};

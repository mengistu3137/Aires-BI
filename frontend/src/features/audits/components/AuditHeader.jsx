import React from "react";
import { useNavigate } from "react-router-dom";
import { AuditStatusBanner } from "./AuditStatusBanner.jsx";
import { AuditGPSStatus } from "./AuditGPSStatus.jsx";
import { formatDateTime, formatDate } from "../utils/audit.utils.js";

/**
 * Full audit header — single source of truth for audit-level metadata.
 *
 * Shows:
 *  - Back button + audit status
 *  - Store (name + address/city/area + competitor)
 *  - Auditor (name + role + phone + email)
 *  - Survey period (name + date range + status)
 *  - Timing (created / assigned / started / completed)
 *  - Assignment summary (required products count)
 *  - GPS verification (existing AuditGPSStatus)
 *  - Notes (existing)
 */
export const AuditHeader = ({ audit, onBack }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  if (!audit) return null;

  const auditor = audit.auditor;
  const store = audit.store;
  const competitor = store?.competitor;
  const surveyPeriod = audit.surveyPeriod;
  const assignment = audit.assignment;

  const assignmentItems = assignment?.items || [];
  const requiredCount = assignmentItems.filter((i) => i.required).length;
  const observedCount = audit.observationsCount || 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
      {/* Back button + Status */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <AuditStatusBanner status={audit.status} />
      </div>

      {/* Store Info */}
      <div className="mt-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-black text-slate-800">
                {store?.name || "Unknown store"}
              </h1>
              {competitor && (
                <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {competitor.name}
                </span>
              )}
              {store?.type && (
                <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {store.type}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {[store?.area, store?.city].filter(Boolean).join(", ") ||
                store?.address ||
                "No location"}
            </p>
            {store?.address && (store?.area || store?.city) && (
              <p className="mt-0.5 truncate text-[11px] text-slate-400">{store.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* Auditor + Survey period cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Auditor */}
        {auditor && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Auditor</p>
            <div className="mt-1.5 flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
                {auditor.name?.slice(0, 2).toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{auditor.name}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {auditor.role === "FIELD_AUDITOR"
                    ? "Field Auditor"
                    : auditor.role === "MANAGER"
                      ? "Pricing Manager"
                      : "Administrator"}
                </p>
                {auditor.phone && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">{auditor.phone}</p>
                )}
                {auditor.email && (
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{auditor.email}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Survey period */}
        {surveyPeriod && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Survey period
            </p>
            <div className="mt-1.5 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800">{surveyPeriod.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {formatDate(surveyPeriod.startDate)} → {formatDate(surveyPeriod.endDate)}
                </p>
              </div>
              {surveyPeriod.status && (
                <span
                  className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    surveyPeriod.status === "OPEN"
                      ? "border-emerald-200 bg-emerald-50 text-[#017C4D]"
                      : surveyPeriod.status === "DRAFT"
                        ? "border-amber-200 bg-amber-50 text-[#FE7914]"
                        : "border-slate-200 bg-slate-100 text-slate-600"
                  }`}
                >
                  {surveyPeriod.status}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timing grid */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>Created: {formatDateTime(audit.createdAt)}</span>
        </div>

        {assignment?.assignedAt && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Assigned: {formatDateTime(assignment.assignedAt)}</span>
          </div>
        )}

        {audit.startedAt && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Started: {formatDateTime(audit.startedAt)}</span>
          </div>
        )}

        {audit.completedAt && (
          <div className="flex items-center gap-2 text-xs text-[#017C4D]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Completed: {formatDateTime(audit.completedAt)}</span>
          </div>
        )}
      </div>

      {/* Assignment summary — only when we have items */}
      {requiredCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Required products
            </span>
            <span className="text-sm font-black text-slate-800">{requiredCount}</span>
          </div>
          <span className="text-slate-300">·</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Observed
            </span>
            <span
              className={`text-sm font-black ${
                observedCount >= requiredCount ? "text-[#017C4D]" : "text-slate-800"
              }`}
            >
              {observedCount}
            </span>
          </div>
          {observedCount < requiredCount && (
            <span className="ml-auto rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
              {requiredCount - observedCount} remaining
            </span>
          )}
          {observedCount >= requiredCount && (
            <span className="ml-auto rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#017C4D]">
              Complete
            </span>
          )}
        </div>
      )}

      {/* GPS Status */}
      <div className="mt-4">
        <AuditGPSStatus audit={audit} />
      </div>

      {/* Notes */}
      {audit.notes && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{audit.notes}</p>
        </div>
      )}
    </div>
  );
};

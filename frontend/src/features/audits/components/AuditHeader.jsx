import React from "react";
import { useNavigate } from "react-router-dom";
import { AuditStatusBanner } from "./AuditStatusBanner.jsx";
import { AuditGPSStatus } from "./AuditGPSStatus.jsx";
import { formatDateTime } from "../utils/audit.utils.js";

export const AuditHeader = ({ audit, onBack }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

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
            <h1 className="truncate text-lg font-black text-slate-800">{audit.store?.name}</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {audit.store?.address || audit.store?.city || "No address"}
            </p>
            {audit.store?.competitor && (
              <p className="mt-1 text-xs font-semibold text-[#A41821]">
                {audit.store.competitor.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Meta Info */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>Created: {formatDateTime(audit.createdAt)}</span>
        </div>
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

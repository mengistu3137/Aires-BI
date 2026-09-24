import React from "react";
import { formatDateTime } from "../utils/alert.utils.js";

/**
 * Resolution information section for a resolved alert.
 */
export const AlertResolutionSection = ({ alert }) => {
  if (!alert.resolved) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 text-[#017C4D]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#017C4D]">Resolution</p>
      </div>

      <dl className="mt-3 divide-y divide-emerald-100">
        {alert.resolvedBy && (
          <div className="flex items-start justify-between gap-3 py-2">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Resolved by
            </dt>
            <dd className="text-right text-xs font-semibold text-slate-700">
              {alert.resolvedBy.name}
              {alert.resolvedBy.role && (
                <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {alert.resolvedBy.role}
                </span>
              )}
            </dd>
          </div>
        )}
        {alert.resolvedAt && (
          <div className="flex items-start justify-between gap-3 py-2">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Resolved at
            </dt>
            <dd className="text-right text-xs font-semibold text-slate-700">
              {formatDateTime(alert.resolvedAt)}
            </dd>
          </div>
        )}
        {alert.resolutionNote && (
          <div className="py-2">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Resolution note
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
              {alert.resolutionNote}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
};

import React from "react";
import { SEVERITY_RANK } from "../utils/alert.utils.js";

/**
 * Summary bar scoped to the current page of alerts.
 * Counts by severity and resolved/unresolved state.
 *
 * NOTE: This is a per-page summary, not a global survey-period summary.
 * A dedicated summary endpoint does not exist in the backend.
 */
export const AlertSummaryBar = ({ alerts = [], meta = null }) => {
  let unresolved = 0;
  let critical = 0;
  let high = 0;
  let resolved = 0;

  for (const alert of alerts) {
    if (alert.resolved) resolved += 1;
    else unresolved += 1;
    if (alert.severity === "CRITICAL") critical += 1;
    if (alert.severity === "HIGH") high += 1;
  }

  const showPageNote = meta && meta.total > alerts.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          This page
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">Unresolved</span>
          <span className="text-xs font-black text-[#A41821]">{unresolved}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">Critical</span>
          <span className="text-xs font-black text-[#A41821]">{critical}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">High</span>
          <span className="text-xs font-black text-[#FE7914]">{high}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-slate-500">Resolved</span>
          <span className="text-xs font-black text-[#017C4D]">{resolved}</span>
        </div>
        {showPageNote && (
          <span className="ml-auto text-[10px] text-slate-400">
            {alerts.length} of {meta.total} alerts
          </span>
        )}
      </div>
    </div>
  );
};

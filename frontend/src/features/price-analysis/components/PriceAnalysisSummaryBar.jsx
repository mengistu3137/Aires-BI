import React from "react";
import { PRICE_ACTIONS } from "../schemas/price-analysis.schema.js";
import { getActionLabel } from "../utils/price-analysis.utils.js";

/**
 * Summary bar showing counts per PriceAction for the currently loaded page.
 *
 * IMPORTANT: This is computed from the currently visible page of records,
 * NOT the entire dataset. Do NOT present it as a full survey-period summary
 * unless a dedicated summary endpoint exists.
 */
export const PriceAnalysisSummaryBar = ({ analyses = [], meta = null }) => {
  const counts = PRICE_ACTIONS.reduce((acc, action) => {
    acc[action] = 0;
    return acc;
  }, {});
  let undetermined = 0;

  for (const analysis of analyses) {
    if (analysis.action && counts[analysis.action] !== undefined) {
      counts[analysis.action] += 1;
    } else {
      undetermined += 1;
    }
  }

  const totalOnPage = analyses.length;
  const showPageNote = meta && meta.total > analyses.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          This page
        </span>
        {PRICE_ACTIONS.map((action) => (
          <div key={action} className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-500">
              {getActionLabel(action)}
            </span>
            <span className="text-xs font-black text-slate-800">{counts[action]}</span>
          </div>
        ))}
        {undetermined > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-500">Not determined</span>
            <span className="text-xs font-black text-slate-400">{undetermined}</span>
          </div>
        )}
        {showPageNote && (
          <span className="ml-auto text-[10px] text-slate-400">
            {analyses.length} of {meta.total} records
          </span>
        )}
      </div>
    </div>
  );
};

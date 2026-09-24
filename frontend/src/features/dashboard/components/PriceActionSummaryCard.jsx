import React from "react";
import { useNavigate } from "react-router-dom";
import {
  formatIndex,
  getPriceActionColors,
  getPriceActionLabel,
} from "../utils/dashboard.utils.js";

/**
 * Price action distribution from backend `analysis.byAction`.
 * Average index comes from backend `analysis.indexStats.average`.
 */
export const PriceActionSummaryCard = ({ analysis }) => {
  const navigate = useNavigate();

  if (!analysis) return null;

  const byAction = analysis.byAction || {};
  const actions = ["PRICE_DOWN", "PRICE_UP", "KEEP", "REVIEW"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Price actions
        </h2>
        <button
          type="button"
          onClick={() => navigate("/price-analysis")}
          className="text-[11px] font-bold text-[#A41821] hover:underline"
        >
          View price analysis
        </button>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        {analysis.total} product{analysis.total === 1 ? "" : "s"} analyzed
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => {
          const colors = getPriceActionColors(action);
          return (
            <div
              key={action}
              className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2"
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {getPriceActionLabel(action)}
                </p>
              </div>
              <p className={`mt-1 text-lg font-black ${colors.text}`}>{byAction[action] ?? 0}</p>
            </div>
          );
        })}
      </div>

      {analysis.indexStats && analysis.indexStats.average !== null && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-medium text-slate-500">Average price index</span>
            <span className="font-black text-slate-800">
              {formatIndex(analysis.indexStats.average)}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              Min {formatIndex(analysis.indexStats.min)} · Max{" "}
              {formatIndex(analysis.indexStats.max)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

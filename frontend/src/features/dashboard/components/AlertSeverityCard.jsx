import React from "react";
import { useNavigate } from "react-router-dom";
import { getSeverityColors } from "../utils/dashboard.utils.js";

/**
 * Alert severity distribution from backend `alerts.bySeverity`.
 * Uses `alerts.active` for the open count.
 */
export const AlertSeverityCard = ({ alerts }) => {
  const navigate = useNavigate();

  if (!alerts) return null;

  const bySeverity = alerts.bySeverity || {};
  const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Alerts requiring attention
        </h2>
        <button
          type="button"
          onClick={() => navigate("/alerts")}
          className="text-[11px] font-bold text-[#A41821] hover:underline"
        >
          View alerts
        </button>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-800">{alerts.active ?? 0}</span>
        <span className="text-[11px] font-medium text-slate-500">
          unresolved alert{(alerts.active ?? 0) === 1 ? "" : "s"}
        </span>
      </div>

      {alerts.resolved > 0 && (
        <p className="mt-1 text-[10px] text-slate-400">{alerts.resolved} resolved</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {severities.map((sev) => {
          const colors = getSeverityColors(sev);
          return (
            <div key={sev} className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {sev}
                </p>
              </div>
              <p className={`mt-1 text-lg font-black ${colors.text}`}>{bySeverity[sev] ?? 0}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

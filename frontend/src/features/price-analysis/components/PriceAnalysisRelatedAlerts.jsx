import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Compact related alerts section.
 * Alerts are optional and only shown when the backend associates them.
 *
 * NOTE: If your backend exposes a direct query (e.g. by productId + surveyPeriodId),
 * wire it here. Currently this component expects the parent to pass pre-fetched alerts.
 */
export const PriceAnalysisRelatedAlerts = ({ alerts = [], loading = false }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Related alerts
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#A41821] border-t-transparent" />
          Loading alerts...
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Related alerts
        </p>
        <p className="mt-2 text-xs text-slate-500">No alerts are associated with this analysis.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Related alerts
        </p>
        <button
          type="button"
          onClick={() => navigate("/alerts")}
          className="text-[11px] font-bold text-[#A41821] hover:underline"
        >
          View all
        </button>
      </div>
      <ul className="mt-2 space-y-2">
        {alerts.slice(0, 3).map((alert) => (
          <li
            key={alert.id}
            className="flex items-start gap-2 rounded-lg border border-slate-100 px-2.5 py-2"
          >
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                alert.severity === "CRITICAL"
                  ? "bg-[#A41821]"
                  : alert.severity === "HIGH"
                    ? "bg-[#FE7914]"
                    : alert.severity === "MEDIUM"
                      ? "bg-amber-400"
                      : "bg-slate-400"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-700">{alert.message}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {alert.resolved ? "Resolved" : "Unresolved"} · {alert.type}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

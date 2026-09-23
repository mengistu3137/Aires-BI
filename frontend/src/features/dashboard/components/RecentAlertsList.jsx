import React from "react";
import { useNavigate } from "react-router-dom";
import { formatIndex, formatRelativeTime, getSeverityColors } from "../utils/dashboard.utils.js";

/**
 * Recent unresolved alerts from backend `recentAlerts` (top 5).
 */
export const RecentAlertsList = ({ recentAlerts = [] }) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Recent alerts
        </h2>
        <button
          type="button"
          onClick={() => navigate("/alerts")}
          className="text-[11px] font-bold text-[#A41821] hover:underline"
        >
          View all
        </button>
      </div>

      {recentAlerts.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
          <p className="text-xs font-medium text-slate-400">No unresolved alerts</p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {recentAlerts.map((alert) => {
            const colors = getSeverityColors(alert.severity);
            return (
              <li key={alert.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/alerts/${alert.id}`)}
                  className="flex w-full items-start gap-2 py-2.5 text-left transition hover:bg-slate-50/70"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-bold text-slate-800">
                        {alert.product?.name || "Unknown product"}
                      </p>
                      <span
                        className={`shrink-0 text-[9px] font-bold uppercase tracking-wider ${colors.text}`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">
                      {alert.message}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-400">
                      <span>{formatRelativeTime(alert.createdAt)}</span>
                      {alert.priceIndex !== null && (
                        <span>Index {formatIndex(alert.priceIndex)}</span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

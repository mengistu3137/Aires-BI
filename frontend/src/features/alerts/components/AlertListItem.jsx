import React from "react";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../utils/alert.utils.js";
import { AlertSeverityBadge } from "./AlertSeverityBadge.jsx";
import { AlertTypeBadge } from "./AlertTypeBadge.jsx";
import { AlertStatusBadge } from "./AlertStatusBadge.jsx";

/**
 * Mobile-optimized alert list item.
 */
export const AlertListItem = ({ alert }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/alerts/${alert.id}`)}
      className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">
            {alert.product?.name || "Unknown product"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            {alert.product?.category}
            {alert.product?.sku && ` · SKU ${alert.product.sku}`}
          </p>
        </div>
        <AlertSeverityBadge severity={alert.severity} />
      </div>

      <p className="line-clamp-2 text-[11px] text-slate-600">{alert.message}</p>

      <div className="flex flex-wrap items-center gap-2">
        <AlertTypeBadge type={alert.type} />
        <AlertStatusBadge resolved={alert.resolved} />
        <span className="ml-auto text-[10px] text-slate-400">
          {formatRelativeTime(alert.createdAt)}
        </span>
      </div>
    </button>
  );
};

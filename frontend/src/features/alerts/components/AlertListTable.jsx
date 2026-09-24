import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate, formatIndex, formatPrice } from "../utils/alert.utils.js";
import { AlertSeverityBadge } from "./AlertSeverityBadge.jsx";
import { AlertTypeBadge } from "./AlertTypeBadge.jsx";
import { AlertStatusBadge } from "./AlertStatusBadge.jsx";

/**
 * Desktop table for alerts.
 * Matches the visual conventions used by Price Analysis.
 */
export const AlertListTable = ({ alerts = [] }) => {
  const navigate = useNavigate();

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <p className="text-xs font-medium text-slate-400">No alerts match your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Alert</th>
              <th className="px-4 py-3 text-right">Queens price</th>
              <th className="px-4 py-3 text-right">Competitor</th>
              <th className="px-4 py-3 text-right">Price index</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {alerts.map((alert) => (
              <tr
                key={alert.id}
                className="cursor-pointer transition hover:bg-slate-50/75"
                onClick={() => navigate(`/alerts/${alert.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-800">{alert.product?.name || "—"}</div>
                  {alert.product?.sku && (
                    <div className="text-[10px] text-slate-400">SKU {alert.product.sku}</div>
                  )}
                </td>
                <td className="max-w-xs px-4 py-3">
                  <AlertTypeBadge type={alert.type} />
                  <p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{alert.message}</p>
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">
                  {formatPrice(alert.queensPrice)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatPrice(alert.competitorPrice)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">
                  {formatIndex(alert.priceIndex)}
                </td>
                <td className="px-4 py-3">
                  <AlertSeverityBadge severity={alert.severity} />
                </td>
                <td className="px-4 py-3">
                  <AlertStatusBadge resolved={alert.resolved} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(alert.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

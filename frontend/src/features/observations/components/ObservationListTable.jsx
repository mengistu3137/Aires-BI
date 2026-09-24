import React from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice, formatCapturedAt } from "../utils/observation.utils.js";
import { ObservationAvailabilityBadge } from "./ObservationAvailabilityBadge.jsx";
import { ObservationReviewBadge } from "./ObservationReviewBadge.jsx";
import { ObservationSyncBadge } from "./ObservationSyncBadge.jsx";

export const ObservationListTable = ({ observations = [] }) => {
  const navigate = useNavigate();

  if (observations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <p className="text-xs font-medium text-slate-400">No observations match your filters</p>
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
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Auditor</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Sync</th>
              <th className="px-4 py-3">Captured</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {observations.map((o) => (
              <tr
                key={o.id}
                className="cursor-pointer transition hover:bg-slate-50/75"
                onClick={() => navigate(`/observations/${o.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-800">{o.product?.name || "—"}</div>
                  {o.product?.sku && (
                    <div className="text-[10px] text-slate-400">SKU {o.product.sku}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{o.audit?.store?.name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{o.auditor?.name || "—"}</td>
                <td className="px-4 py-3">
                  <ObservationAvailabilityBadge availability={o.availability} />
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">
                  {formatPrice(o.price)}
                </td>
                <td className="px-4 py-3">
                  <ObservationReviewBadge status={o.review?.status} />
                </td>
                <td className="px-4 py-3">
                  <ObservationSyncBadge status={o.sync?.status} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatCapturedAt(o.capturedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

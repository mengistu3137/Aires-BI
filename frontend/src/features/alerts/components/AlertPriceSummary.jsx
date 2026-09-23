import React from "react";
import { formatIndex, formatPrice } from "../utils/alert.utils.js";

/**
 * Compact key-value price summary for an alert.
 */
export const AlertPriceSummary = ({ alert, className = "" }) => {
  const rows = [
    { label: "Queens price", value: formatPrice(alert.queensPrice) },
    { label: "Competitor price", value: formatPrice(alert.competitorPrice) },
    { label: "Price index", value: formatIndex(alert.priceIndex) },
  ];

  return (
    <dl className={`divide-y divide-slate-100 ${className}`}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-start justify-between gap-3 py-2.5">
          <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {row.label}
          </dt>
          <dd className="text-right text-xs font-semibold text-slate-700">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
};

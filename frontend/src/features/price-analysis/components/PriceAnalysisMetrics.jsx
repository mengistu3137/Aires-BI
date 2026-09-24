import React from "react";
import { formatIndex, formatPrice } from "../utils/price-analysis.utils.js";

/**
 * Compact key-value metric rows for an analysis record.
 * Used on the detail page and on the summary bar.
 */
export const PriceAnalysisMetrics = ({ analysis }) => {
  const rows = [
    { label: "Queens price", value: formatPrice(analysis.queensPrice) },
    {
      label: "Minimum competitor",
      value: formatPrice(analysis.minimumCompetitorPrice),
    },
    {
      label: "Average competitor",
      value: formatPrice(analysis.competitorAveragePrice),
    },
    { label: "Price index", value: formatIndex(analysis.priceIndex) },
    { label: "Target index", value: formatIndex(analysis.targetIndex) },
  ];

  return (
    <dl className="divide-y divide-slate-100">
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

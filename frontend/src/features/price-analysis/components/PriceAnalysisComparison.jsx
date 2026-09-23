import React from "react";
import { formatPrice } from "../utils/price-analysis.utils.js";

/**
 * Compact horizontal price comparison:
 * Queens benchmark vs minimum competitor vs average competitor.
 *
 * No calculations performed — displays backend values as-is.
 */
export const PriceAnalysisComparison = ({
  queensPrice,
  minimumCompetitorPrice,
  competitorAveragePrice,
}) => {
  const items = [
    {
      label: "Queens benchmark",
      value: queensPrice,
      barColor: "bg-[#A41821]",
    },
    {
      label: "Average competitor",
      value: competitorAveragePrice,
      barColor: "bg-[#017C4D]",
    },
    {
      label: "Minimum competitor",
      value: minimumCompetitorPrice,
      barColor: "bg-[#FE7914]",
    },
  ];

  const validValues = items.map((i) => Number(i.value)).filter((v) => !Number.isNaN(v) && v > 0);
  const maxValue = validValues.length > 0 ? Math.max(...validValues) : 1;

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const num = item.value !== null && item.value !== undefined ? Number(item.value) : null;
        const width =
          num !== null && !Number.isNaN(num) && maxValue > 0
            ? Math.max(4, Math.round((num / maxValue) * 100))
            : 0;

        return (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">{item.label}</span>
              <span className="font-bold text-slate-800">{formatPrice(item.value)}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.barColor} transition-all duration-500`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

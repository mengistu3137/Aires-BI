import React from "react";
import { PRICE_ACTIONS } from "../schemas/price-analysis.schema.js";
import { getActionLabel } from "../utils/price-analysis.utils.js";

/**
 * Action filter pills.
 * Filters list by PriceAction value.
 */
export const ActionFilter = ({ value, onChange }) => {
  const options = [
    { value: "", label: "All" },
    ...PRICE_ACTIONS.map((action) => ({
      value: action,
      label: getActionLabel(action),
    })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => (
        <button
          key={option.value || "all"}
          type="button"
          onClick={() => onChange(option.value)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            value === option.value
              ? "bg-[#A41821] text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

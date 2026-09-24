import React from "react";

const OPTIONS = [
  {
    value: "AVAILABLE",
    label: "Available",
    activeClasses: "border-[#017C4D] bg-emerald-50 text-[#017C4D]",
  },
  {
    value: "OUT_OF_STOCK",
    label: "Out of stock",
    activeClasses: "border-[#A41821] bg-red-50 text-[#A41821]",
  },
  {
    value: "NOT_FOUND",
    label: "Not found",
    activeClasses: "border-slate-500 bg-slate-100 text-slate-800",
  },
];

export const AvailabilitySelector = ({ value, onChange, disabled = false, error }) => {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Availability
      </label>
      <div
        role="radiogroup"
        aria-label="Product availability"
        className="mt-2 grid grid-cols-3 gap-2"
      >
        {OPTIONS.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`flex min-h-[52px] items-center justify-center rounded-xl border px-2 py-2.5 text-xs font-semibold transition focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2 disabled:opacity-50 ${
                isActive
                  ? option.activeClasses
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-[#A41821]">{error}</p>}
    </div>
  );
};

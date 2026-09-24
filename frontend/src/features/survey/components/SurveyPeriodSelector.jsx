import React from "react";
import { useSurveyPeriods } from "../hooks/useSurveyPeriods.js";

export const SurveyPeriodSelector = ({
  value,
  onChange,
  disabled = false,
  label = "Survey period",
  placeholder = "Current period",
  className = "",
}) => {
  const { data: periods = [], isLoading, isError } = useSurveyPeriods();

  const openPeriod = periods.find((p) => p.status === "OPEN");
  const otherPeriods = periods.filter((p) => p.status !== "OPEN");

  return (
    <div className={`w-full sm:max-w-xs ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </label>
      )}
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821] disabled:opacity-50"
      >
        <option value="">
          {isLoading
            ? "Loading survey periods..."
            : isError
              ? "Unable to load periods"
              : placeholder}
        </option>

        {openPeriod && (
          <optgroup label="Open">
            <option value={openPeriod.id}>
              {openPeriod.name || openPeriod.id}
              {openPeriod.status && ` · ${openPeriod.status}`}
            </option>
          </optgroup>
        )}

        {otherPeriods.length > 0 && (
          <optgroup label="Other periods">
            {otherPeriods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name || period.id}
                {period.status && ` · ${period.status}`}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
};

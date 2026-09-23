import React from "react";
import { useDashboardSurveyPeriods } from "../hooks/useDashboardSurveyPeriods.js";

/**
 * Survey period selector for the Dashboard.
 * Empty value = "All survey periods" (backend will resolve to OPEN or latest).
 */
export const SurveyPeriodSelector = ({ value, onChange }) => {
  const { data: periods = [], isLoading } = useDashboardSurveyPeriods();

  return (
    <div className="w-full sm:max-w-xs">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Survey period
      </label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821] disabled:opacity-50"
      >
        <option value="">{isLoading ? "Loading survey periods..." : "Current period"}</option>
        {periods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.name}
            {period.status && ` · ${period.status}`}
          </option>
        ))}
      </select>
    </div>
  );
};

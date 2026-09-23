import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";

/**
 * Survey period selector.
 * Fetches survey periods from the API and allows selecting one.
 * Uses a native <select> for maximum mobile compatibility and consistency
 * with the project's existing form controls.
 */
const fetchSurveyPeriods = async () => {
  const response = await apiClient.get("/survey-periods", {
    params: { limit: 100 },
  });
  return response.data.data.periods || response.data || [];
};

export const SurveyPeriodSelector = ({
  value,
  onChange,
  disabled = false,
  label = "Survey period",
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ["survey-periods", "list"],
    queryFn: fetchSurveyPeriods,
    staleTime: 5 * 60 * 1000,
  });
  console.log("SurveyPeriodSelector - data:", data, "isLoading:", isLoading);

  const surveyPeriods = data?.data || [];

  return (
    <div>
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
        <option value="">{isLoading ? "Loading survey periods..." : "All survey periods"}</option>
        {surveyPeriods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.name}
            {period.status && ` · ${period.status}`}
          </option>
        ))}
      </select>
    </div>
  );
};

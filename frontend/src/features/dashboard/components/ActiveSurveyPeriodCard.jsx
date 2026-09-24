import React from "react";
import { formatDate, getSurveyPeriodStatusColors } from "../utils/dashboard.utils.js";

/**
 * Displays the survey period resolved by the backend (scope.surveyPeriod).
 * Backend resolves: explicit id → OPEN → latest.
 */
export const ActiveSurveyPeriodCard = ({ surveyPeriod }) => {
  if (!surveyPeriod) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Survey period
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-600">No survey period available</p>
        <p className="mt-1 text-xs text-slate-400">
          Create a survey period to begin collecting field data.
        </p>
      </div>
    );
  }

  const colors = getSurveyPeriodStatusColors(surveyPeriod.status);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Active survey period
          </p>
          <p className="mt-1 text-base font-black text-slate-800">{surveyPeriod.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDate(surveyPeriod.startDate)} → {formatDate(surveyPeriod.endDate)}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
          {surveyPeriod.status}
        </span>
      </div>
    </div>
  );
};

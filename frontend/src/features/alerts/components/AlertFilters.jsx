import React from "react";
import { ALERT_SEVERITIES, ALERT_TYPES } from "../schemas/alert.schema.js";
import { getAlertTypeLabel, getSeverityLabel } from "../utils/alert.utils.js";

/**
 * Filter bar for alerts.
 * Uses backend-supported query parameters only.
 */
export const AlertFilters = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  severityFilter,
  onSeverityFilterChange,
  typeFilter,
  onTypeFilterChange,
}) => {
  const statusOptions = [
    { value: "", label: "All" },
    { value: "false", label: "Unresolved" },
    { value: "true", label: "Resolved" },
  ];

  return (
    <div className="space-y-3">
      {/* Search + status */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search alerts"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
          />
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Type pills */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: "", label: "All" },
            ...ALERT_TYPES.map((t) => ({
              value: t,
              label: getAlertTypeLabel(t),
            })),
          ].map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              onClick={() => onTypeFilterChange(opt.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                typeFilter === opt.value
                  ? "bg-[#A41821] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Severity pills */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Severity
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: "", label: "All" },
            ...ALERT_SEVERITIES.map((s) => ({
              value: s,
              label: getSeverityLabel(s),
            })),
          ].map((opt) => (
            <button
              key={opt.value || "all"}
              type="button"
              onClick={() => onSeverityFilterChange(opt.value)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                severityFilter === opt.value
                  ? "bg-[#A41821] text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

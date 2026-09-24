import React from "react";

/**
 * Filter bar for Queen's benchmark prices list.
 * Adheres to Aires-BI typography & brand standards.
 */
export const QueensPriceFilters = ({
  search,
  onSearchChange,
  currentFilter,
  onCurrentFilterChange,
}) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative w-full sm:max-w-xs">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products by name or SKU..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821] transition"
        />
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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

      {/* Filter Mode Toggle Pills */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs">
        <button
          type="button"
          onClick={() => onCurrentFilterChange(false)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            !currentFilter
              ? "bg-white text-slate-900 shadow-2xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          All Periods
        </button>
        <button
          type="button"
          onClick={() => onCurrentFilterChange(true)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
            currentFilter
              ? "bg-[#A41821] text-white shadow-2xs"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Current Benchmark
        </button>
      </div>
    </div>
  );
};
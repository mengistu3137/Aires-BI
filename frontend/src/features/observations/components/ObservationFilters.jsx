import React from "react";

const REVIEW_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
];

const AVAILABILITY_OPTIONS = [
  { value: "", label: "All" },
  { value: "AVAILABLE", label: "Available" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "NOT_FOUND", label: "Not found" },
];

export const ObservationFilters = ({
  search,
  onSearchChange,
  availability,
  onAvailabilityChange,
  reviewStatus,
  onReviewStatusChange,
}) => {
  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by product, store, or auditor"
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Availability
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {AVAILABILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => onAvailabilityChange(opt.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  availability === opt.value
                    ? "bg-[#A41821] text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Review status
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {REVIEW_STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value || "all"}
                type="button"
                onClick={() => onReviewStatusChange(opt.value)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  reviewStatus === opt.value
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
    </div>
  );
};

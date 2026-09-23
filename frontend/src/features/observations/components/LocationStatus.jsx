import React from "react";

/**
 * Displays the current GPS capture status.
 * Does not expose raw latitude/longitude — only accuracy.
 */
export const LocationStatus = ({ status, accuracyMeters, onRetry }) => {
  if (status === "idle") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5">
        <svg
          className="h-4 w-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="text-xs font-medium text-slate-500">Location not captured</span>
      </div>
    );
  }

  if (status === "capturing") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="text-xs font-medium text-blue-700">Getting your location...</span>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
        <svg
          className="h-4 w-4 text-[#017C4D]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs font-medium text-[#017C4D]">
          Location captured
          {accuracyMeters !== null && accuracyMeters !== undefined
            ? ` · Accuracy ${Math.round(accuracyMeters)} m`
            : ""}
        </span>
      </div>
    );
  }

  // error
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 text-[#A41821]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="text-xs font-medium text-[#A41821]">Unable to get your location</span>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-bold text-[#A41821] underline"
        >
          Try again
        </button>
      )}
    </div>
  );
};

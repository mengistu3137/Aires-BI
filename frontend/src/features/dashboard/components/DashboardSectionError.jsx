import React from "react";

/**
 * Inline error for a single dashboard section.
 * Used when the whole dashboard query fails — Dashboard is a single
 * endpoint, so this is rendered once at the page level.
 */
export const DashboardSectionError = ({ message, onRetry }) => {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-xs font-bold text-[#A41821]">Unable to load dashboard</p>
      <p className="mt-1 text-[11px] text-red-700">{message || "Please try again in a moment."}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-[#A41821] transition hover:bg-red-50"
        >
          Try again
        </button>
      )}
    </div>
  );
};

import React from "react";

/**
 * Confirmation modal for recalculating the entire survey period.
 * Matches the existing audit/observation modal pattern.
 */
export const RecalculateConfirmModal = ({
  isOpen,
  onCancel,
  onConfirm,
  isPending,
  surveyPeriodName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <h3 className="text-sm font-bold text-slate-800">Recalculate price analysis?</h3>
        <p className="mt-2 text-xs text-slate-600">
          This will update the price analysis for all products assigned to{" "}
          <span className="font-bold">{surveyPeriodName || "this survey period"}</span> using the
          latest available benchmark and approved competitor prices.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219] disabled:opacity-50"
          >
            {isPending ? "Recalculating..." : "Recalculate"}
          </button>
        </div>
      </div>
    </div>
  );
};

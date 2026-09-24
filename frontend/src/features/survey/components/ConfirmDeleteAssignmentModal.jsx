import React from "react";

export const ConfirmDeleteAssignmentModal = ({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  assignment,
}) => {
  if (!isOpen || !assignment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl">
        <h3 className="text-sm font-bold text-slate-900">Delete this assignment?</h3>
        <p className="mt-1.5 text-xs text-slate-600">
          You are about to delete the assignment for{" "}
          <span className="font-bold text-slate-900">{assignment.store?.name || "this store"}</span>{" "}
          assigned to{" "}
          <span className="font-bold text-slate-900">
            {assignment.auditor?.name || "the auditor"}
          </span>
          . This cannot be undone.
        </p>
        <p className="mt-2 text-[11px] text-slate-500">
          Assignments with a started or completed audit cannot be deleted.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="cursor-pointer rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219] disabled:opacity-50"
          >
            {isPending ? "Deleting..." : "Delete assignment"}
          </button>
        </div>
      </div>
    </div>
  );
};

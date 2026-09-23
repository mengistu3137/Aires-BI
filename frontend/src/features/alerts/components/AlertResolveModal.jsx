import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resolveAlertFormSchema } from "../schemas/alert.schema.js";

/**
 * Modal for resolving an alert.
 * Uses the same form/modal pattern as the rest of the app.
 */
export const AlertResolveModal = ({
  isOpen,
  onClose,
  onSubmit,
  isPending = false,
  error = null,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resolveAlertFormSchema),
    defaultValues: { resolutionNote: "" },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data) => {
    onSubmit({ resolutionNote: data.resolutionNote?.trim() || undefined });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={handleClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Resolve this alert?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Marking this alert as resolved will record your note and close the operational action.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close dialog"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Resolution note
          </label>
          <textarea
            rows={4}
            placeholder="Optional — what action was taken?"
            {...register("resolutionNote")}
            className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
          />
          {errors.resolutionNote && (
            <p className="mt-1 text-xs font-medium text-[#A41821]">
              {errors.resolutionNote.message}
            </p>
          )}

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5">
              <p className="text-xs font-medium text-[#A41821]">{error}</p>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[#017C4D] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#015E3A] disabled:opacity-50"
            >
              {isPending ? "Resolving..." : "Resolve alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

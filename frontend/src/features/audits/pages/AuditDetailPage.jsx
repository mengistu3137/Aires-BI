import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { useAudit } from "../hooks/useAudit.js";
import {
  useStartAudit,
  useCompleteAudit,
  useCancelAudit,
  useUpdateAudit,
  useMarkAuditReview,
} from "../hooks/useAuditMutations.js";
import { useGeolocation } from "../hooks/useGeolocation.js";
import { AuditHeader } from "../components/AuditHeader.jsx";
import { AuditObservationsList } from "../components/AuditObservationsList.jsx";
import { AuditProgressRing } from "../components/AuditProgressRing.jsx";
import {
  startAuditSchema,
  completeAuditSchema,
  cancelAuditSchema,
  markReviewSchema,
  updateAuditSchema,
} from "../schemas/audit.schema.js";
import { calculateAuditProgress, getStatusLabel } from "../utils/audit.utils.js";
import { useAuth } from "@/hooks/useAuth.js";
import { ObservationEmptyState } from "@/features/observations/components/ObservationEmptyState.jsx";

export const AuditDetailPage = () => {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const { captureLocation, isCapturing } = useGeolocation();

  const { data: audit, isLoading, isError, error } = useAudit(auditId);
  const startAudit = useStartAudit();
  const completeAudit = useCompleteAudit();
  const cancelAudit = useCancelAudit();
  const updateAudit = useUpdateAudit();
  const markReview = useMarkAuditReview();

  const [activeModal, setActiveModal] = useState(null); // 'start' | 'complete' | 'cancel' | 'review' | 'notes'

  // Start form
  const startForm = useForm({
    resolver: zodResolver(startAuditSchema),
  });

  // Complete form
  const completeForm = useForm({
    resolver: zodResolver(completeAuditSchema),
  });

  // Cancel form
  const cancelForm = useForm({
    resolver: zodResolver(cancelAuditSchema),
  });

  // Review form
  const reviewForm = useForm({
    resolver: zodResolver(markReviewSchema),
  });

  // Notes form
  const notesForm = useForm({
    resolver: zodResolver(updateAuditSchema),
    defaultValues: { notes: audit?.notes || "" },
  });

  const handleStart = async () => {
    try {
      const location = await captureLocation();
      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
      };
      startForm.reset(payload);
      await startAudit.mutateAsync({ auditId, payload });
      setActiveModal(null);
    } catch (err) {
      toast.error(err?.message || "Failed to start audit");
    }
  };

  const handleComplete = async () => {
    try {
      const location = await captureLocation();
      const notes = completeForm.getValues("notes");
      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
        notes: notes || undefined,
      };
      completeForm.reset(payload);
      await completeAudit.mutateAsync({ auditId, payload });
      setActiveModal(null);
    } catch (err) {
      toast.error(err?.message || "Failed to complete audit");
    }
  };

  const handleCancel = async (data) => {
    try {
      await cancelAudit.mutateAsync({
        auditId,
        payload: { reason: data.reason },
      });
      setActiveModal(null);
    } catch (err) {
      toast.error(err?.message || "Failed to cancel audit");
    }
  };

  const handleReview = async (data) => {
    try {
      await markReview.mutateAsync({
        auditId,
        payload: { reviewNote: data.reviewNote },
      });
      setActiveModal(null);
    } catch (err) {
      toast.error(err?.message || "Failed to mark for review");
    }
  };

  const handleSaveNotes = async (data) => {
    try {
      await updateAudit.mutateAsync({
        auditId,
        payload: { notes: data.notes || null },
      });
      setActiveModal(null);
    } catch (err) {
      toast.error(err?.message || "Failed to update notes");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !audit) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">{error?.message || "Audit not found"}</p>
        <button
          type="button"
          onClick={() => navigate("/audits")}
          className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
        >
          Back to Audits
        </button>
      </div>
    );
  }

  const progress = calculateAuditProgress(audit);
  const canStart = audit.status === "NOT_STARTED";
  const canComplete = audit.status === "IN_PROGRESS";
  const canCancel = ["NOT_STARTED", "IN_PROGRESS"].includes(audit.status);
  const canReview = isManager && ["IN_PROGRESS", "COMPLETED"].includes(audit.status);
  const canEditNotes = audit.status === "IN_PROGRESS";

  return (
    <div className="space-y-4">
      <AuditHeader audit={audit} />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {canStart && (
          <button
            type="button"
            onClick={() => setActiveModal("start")}
            disabled={isCapturing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#017C4D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#015E3A] disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Start Visit
          </button>
        )}

        {canComplete && (
          <button
            type="button"
            onClick={() => setActiveModal("complete")}
            disabled={isCapturing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#017C4D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#015E3A] disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Complete Visit
          </button>
        )}

        {canEditNotes && (
          <button
            type="button"
            onClick={() => setActiveModal("notes")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Notes
          </button>
        )}

        {canReview && (
          <button
            type="button"
            onClick={() => setActiveModal("review")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-[#FE7914] transition hover:bg-amber-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Mark for Review
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            onClick={() => setActiveModal("cancel")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-[#A41821] transition hover:bg-red-100"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Cancel
          </button>
        )}
      </div>

      {/* Progress & Observations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Progress Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Collection Progress
          </h2>
          <div className="mt-4 flex flex-col items-center">
            <AuditProgressRing progress={progress} size={100} strokeWidth={8} />
            <p className="mt-3 text-xs font-medium text-slate-500">
              {audit.observationsCount || 0} observations recorded
            </p>
          </div>
        </div>

        {/* Observations List */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Price Observations
            </h2>
            {audit.status === "IN_PROGRESS" && (
              <button
                type="button"
                onClick={() => navigate(`/audits/${audit.id}/observations`)}
                className="text-xs font-bold text-[#A41821] hover:underline"
              >
                Manage observations
              </button>
            )}
          </div>

          {audit.observationsCount === 0 ? (
            <ObservationEmptyState
              title="No observations recorded yet"
              description="Start by selecting a product from the assignment."
              action={
                audit.status === "IN_PROGRESS" ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/audits/${audit.id}/observations`)}
                    className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219]"
                  >
                    Start observations
                  </button>
                ) : null
              }
            />
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/audits/${audit.id}/observations`)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-slate-300"
            >
              <p className="text-sm font-bold text-slate-800">
                {audit.observationsCount} observation
                {audit.observationsCount === 1 ? "" : "s"} recorded
              </p>
              <p className="mt-1 text-xs text-slate-500">Tap to view or add more observations</p>
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === "start" && (
        <Modal title="Start Audit Visit" onClose={() => setActiveModal(null)}>
          <p className="text-xs text-slate-600">
            We'll capture your GPS location to verify you're at the store.
          </p>
          {isCapturing && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#A41821] border-t-transparent" />
              Capturing location...
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStart}
              disabled={isCapturing || startAudit.isPending}
              className="rounded-xl bg-[#017C4D] px-4 py-2 text-xs font-bold text-white hover:bg-[#015E3A] disabled:opacity-50"
            >
              {startAudit.isPending ? "Starting..." : "Start Visit"}
            </button>
          </div>
        </Modal>
      )}

      {activeModal === "complete" && (
        <Modal title="Complete Audit Visit" onClose={() => setActiveModal(null)}>
          <p className="text-xs text-slate-600">
            We'll capture your end GPS location to verify the visit.
          </p>
          <form onSubmit={completeForm.handleSubmit(handleComplete)} className="mt-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Completion Notes (optional)
            </label>
            <textarea
              rows={2}
              {...completeForm.register("notes")}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={completeAudit.isPending}
                className="rounded-xl bg-[#017C4D] px-4 py-2 text-xs font-bold text-white hover:bg-[#015E3A] disabled:opacity-50"
              >
                {completeAudit.isPending ? "Completing..." : "Complete Visit"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === "cancel" && (
        <Modal title="Cancel Audit" onClose={() => setActiveModal(null)}>
          <form onSubmit={cancelForm.handleSubmit(handleCancel)} className="mt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Reason for cancellation *
            </label>
            <textarea
              rows={3}
              {...cancelForm.register("reason")}
              placeholder="Explain why this audit is being cancelled..."
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden"
            />
            {cancelForm.formState.errors.reason && (
              <p className="mt-1 text-xs font-medium text-[#A41821]">
                {cancelForm.formState.errors.reason.message}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Keep Audit
              </button>
              <button
                type="submit"
                disabled={cancelAudit.isPending}
                className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white hover:bg-[#7F1219] disabled:opacity-50"
              >
                {cancelAudit.isPending ? "Cancelling..." : "Confirm Cancel"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === "review" && (
        <Modal title="Mark for Review" onClose={() => setActiveModal(null)}>
          <form onSubmit={reviewForm.handleSubmit(handleReview)} className="mt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Review note *
            </label>
            <textarea
              rows={3}
              {...reviewForm.register("reviewNote")}
              placeholder="Explain why this audit needs review..."
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden"
            />
            {reviewForm.formState.errors.reviewNote && (
              <p className="mt-1 text-xs font-medium text-[#A41821]">
                {reviewForm.formState.errors.reviewNote.message}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={markReview.isPending}
                className="rounded-xl bg-[#FE7914] px-4 py-2 text-xs font-bold text-white hover:bg-[#D45F06] disabled:opacity-50"
              >
                {markReview.isPending ? "Submitting..." : "Mark for Review"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {activeModal === "notes" && (
        <Modal title="Edit Audit Notes" onClose={() => setActiveModal(null)}>
          <form onSubmit={notesForm.handleSubmit(handleSaveNotes)} className="mt-2">
            <textarea
              rows={4}
              {...notesForm.register("notes")}
              placeholder="Audit notes..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateAudit.isPending}
                className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white hover:bg-[#7F1219] disabled:opacity-50"
              >
                {updateAudit.isPending ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// Simple Modal wrapper
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
    <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
      {children}
    </div>
  </div>
);

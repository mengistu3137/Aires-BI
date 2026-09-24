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
import { AuditProgressRing } from "../components/AuditProgressRing.jsx";
import { cancelAuditSchema, markReviewSchema, updateAuditSchema } from "../schemas/audit.schema.js";
import { calculateAuditProgress } from "../utils/audit.utils.js";
import { useAuth } from "@/hooks/useAuth.js";
import { ObservationEmptyState } from "@/features/observations/components/ObservationEmptyState.jsx";

export const AuditDetailPage = () => {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const { user, isManager, isAdmin } = useAuth();
  const { captureLocation, isCapturing } = useGeolocation();

  const { data: audit, isLoading, isError, error } = useAudit(auditId);
  const startAudit = useStartAudit();
  const completeAudit = useCompleteAudit();
  const cancelAudit = useCancelAudit();
  const updateAudit = useUpdateAudit();
  const markReview = useMarkAuditReview();

  const [activeModal, setActiveModal] = useState(null);

  // Notes-only forms (GPS is captured imperatively, not via form)
  const completeForm = useForm({
    defaultValues: { notes: "" },
  });
  const cancelForm = useForm({ resolver: zodResolver(cancelAuditSchema) });
  const reviewForm = useForm({ resolver: zodResolver(markReviewSchema) });
  const notesForm = useForm({
    resolver: zodResolver(updateAuditSchema),
    defaultValues: { notes: audit?.notes || "" },
  });

  // ────────────────────────────────────────────────────────────
  // GPS helper with explicit success/failure feedback
  // ────────────────────────────────────────────────────────────
  const captureGpsOrThrow = async () => {
    try {
      const location = await captureLocation();
      if (
        !location ||
        typeof location.latitude !== "number" ||
        typeof location.longitude !== "number"
      ) {
        throw new Error("Unable to determine your location.");
      }
      return location;
    } catch (err) {
      const message =
        err?.message && err.message.trim().length > 0
          ? err.message
          : "Unable to capture GPS. Please enable location access and try again.";
      throw new Error(message);
    }
  };

  const handleStart = async () => {
    try {
      const location = await captureGpsOrThrow();
      await startAudit.mutateAsync({
        auditId,
        payload: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracyMeters: location.accuracyMeters,
        },
      });
      setActiveModal(null);
    } catch (err) {
      toast.error(err?.message || "Failed to start audit");
    }
  };

  const handleComplete = async () => {
    try {
      // 1. Capture GPS first — this is what actually determines success
      const location = await captureGpsOrThrow();

      // 2. Read notes from the form
      const notes = completeForm.getValues("notes");

      // 3. Send mutation
      await completeAudit.mutateAsync({
        auditId,
        payload: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracyMeters: location.accuracyMeters,
          notes: notes?.trim() || undefined,
        },
      });

      setActiveModal(null);
      completeForm.reset({ notes: "" });
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
      cancelForm.reset();
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
      reviewForm.reset();
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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-bold text-[#A41821]">{error?.message || "Audit not found"}</p>
          <button
            type="button"
            onClick={() => navigate("/audits")}
            className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
          >
            Back to audits
          </button>
        </div>
      </div>
    );
  }

  const progress = calculateAuditProgress(audit);
  const isAssignedAuditor = Boolean(user?.id && audit.auditor?.id === user.id);

  const canStart = audit.status === "NOT_STARTED" && isAssignedAuditor;
  const canComplete = audit.status === "IN_PROGRESS" && isAssignedAuditor;
  const canCancel =
    ["NOT_STARTED", "IN_PROGRESS"].includes(audit.status) && (isAssignedAuditor || isManager);
  const canReview = isManager && ["IN_PROGRESS", "COMPLETED"].includes(audit.status);
  const canEditNotes = audit.status === "IN_PROGRESS" && isAssignedAuditor;

  const canManageObservations = isAssignedAuditor && audit.status === "IN_PROGRESS";
  const canViewObservations = isManager || isAdmin;

  return (
    <div className="space-y-4">
      <AuditHeader audit={audit} />

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {canStart && (
          <button
            type="button"
            onClick={() => setActiveModal("start")}
            disabled={isCapturing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#017C4D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#015E3A] disabled:opacity-50"
          >
            Start visit
          </button>
        )}

        {canComplete && (
          <button
            type="button"
            onClick={() => setActiveModal("complete")}
            disabled={isCapturing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#017C4D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#015E3A] disabled:opacity-50"
          >
            Complete visit
          </button>
        )}

        {canManageObservations && (
          <button
            type="button"
            onClick={() => navigate(`/audits/${audit.id}/observations`)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#7F1219]"
          >
            Manage observations
          </button>
        )}

        {canViewObservations && !canManageObservations && audit.observationsCount > 0 && (
          <button
            type="button"
            onClick={() => navigate(`/audits/${audit.id}/observations`)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#7F1219]"
          >
            View all observations
          </button>
        )}

        {canEditNotes && (
          <button
            type="button"
            onClick={() => setActiveModal("notes")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Edit notes
          </button>
        )}

        {canReview && (
          <button
            type="button"
            onClick={() => setActiveModal("review")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-[#FE7914] transition hover:bg-amber-100"
          >
            Mark for review
          </button>
        )}

        {canCancel && (
          <button
            type="button"
            onClick={() => setActiveModal("cancel")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-[#A41821] transition hover:bg-red-100"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress + observations summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-1">
          <h2 className="text-xs font-bold text-slate-500">Collection progress</h2>
          <div className="mt-4 flex flex-col items-center">
            <AuditProgressRing progress={progress} size={100} strokeWidth={8} />
            <p className="mt-3 text-xs font-medium text-slate-500">
              {audit.observationsCount || 0} observations recorded
            </p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-500">Price observations</h2>
            {audit.observationsCount > 0 && (
              <button
                type="button"
                onClick={() => navigate(`/audits/${audit.id}/observations`)}
                className="text-xs font-semibold text-[#A41821] hover:underline"
              >
                {canManageObservations ? "Manage observations" : "View all observations"}
              </button>
            )}
          </div>

          {audit.observationsCount === 0 ? (
            <ObservationEmptyState
              title="No observations recorded yet"
              description={
                canManageObservations
                  ? "Start by selecting a product from the assignment."
                  : "The assigned auditor has not recorded any observations yet."
              }
              action={
                canManageObservations ? (
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
              <p className="text-sm font-semibold text-slate-800">
                {audit.observationsCount} observation
                {audit.observationsCount === 1 ? "" : "s"} recorded
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {canManageObservations
                  ? "Tap to continue collecting or review"
                  : "Tap to view the observation details"}
              </p>
            </button>
          )}
        </div>
      </div>

      {/* Location section — start & end GPS */}
      {(audit.gps?.start || audit.gps?.end) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xs font-bold text-slate-500">Location verification</h2>
            {audit.gps?.gpsValid === true && (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#017C4D]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#017C4D]" />
                Location verified
              </span>
            )}
            {audit.gps?.gpsValid === false && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FE7914]" />
                Outside radius
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {audit.gps?.start ? (
              <LocationBlock
                label="Started at"
                coords={audit.gps.start}
                timestamp={audit.startedAt}
              />
            ) : (
              <EmptyLocationBlock label="Started at" />
            )}

            {audit.gps?.end ? (
              <LocationBlock
                label="Completed at"
                coords={audit.gps.end}
                timestamp={audit.completedAt}
              />
            ) : (
              <EmptyLocationBlock label="Completed at" />
            )}
          </div>

          {audit.gps?.distanceFromStoreMeters !== null &&
            audit.gps?.distanceFromStoreMeters !== undefined && (
              <p className="mt-3 text-xs text-slate-500">
                Distance from store:{" "}
                <span className="font-semibold text-slate-700">
                  {Math.round(audit.gps.distanceFromStoreMeters)} m
                </span>
              </p>
            )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* Modals */}
      {/* ──────────────────────────────────────────────────────── */}

      {/* Start visit */}
      {activeModal === "start" && (
        <Modal title="Start audit visit" onClose={() => setActiveModal(null)}>
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
              {startAudit.isPending ? "Starting..." : "Start visit"}
            </button>
          </div>
        </Modal>
      )}

      {/* Complete visit */}
      {activeModal === "complete" && (
        <Modal title="Complete audit visit" onClose={() => setActiveModal(null)}>
          <p className="text-xs text-slate-600">
            We'll capture your end GPS location to verify the visit.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleComplete();
            }}
            className="mt-3"
          >
            <label className="text-xs font-semibold text-slate-600">
              Completion notes (optional)
            </label>
            <textarea
              rows={2}
              {...completeForm.register("notes")}
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden"
            />

            {isCapturing && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#A41821] border-t-transparent" />
                Capturing end location...
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                disabled={isCapturing || completeAudit.isPending}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCapturing || completeAudit.isPending}
                className="rounded-xl bg-[#017C4D] px-4 py-2 text-xs font-bold text-white hover:bg-[#015E3A] disabled:opacity-50"
              >
                {completeAudit.isPending
                  ? "Completing..."
                  : isCapturing
                    ? "Capturing..."
                    : "Complete visit"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel */}
      {activeModal === "cancel" && (
        <Modal title="Cancel audit" onClose={() => setActiveModal(null)}>
          <form onSubmit={cancelForm.handleSubmit(handleCancel)} className="mt-2">
            <label className="text-xs font-semibold text-slate-600">
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
                Keep audit
              </button>
              <button
                type="submit"
                disabled={cancelAudit.isPending}
                className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white hover:bg-[#7F1219] disabled:opacity-50"
              >
                {cancelAudit.isPending ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Mark for review */}
      {activeModal === "review" && (
        <Modal title="Mark for review" onClose={() => setActiveModal(null)}>
          <form onSubmit={reviewForm.handleSubmit(handleReview)} className="mt-2">
            <label className="text-xs font-semibold text-slate-600">Review note *</label>
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
                {markReview.isPending ? "Submitting..." : "Mark for review"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit notes */}
      {activeModal === "notes" && (
        <Modal title="Edit audit notes" onClose={() => setActiveModal(null)}>
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
                {updateAudit.isPending ? "Saving..." : "Save notes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

const LocationBlock = ({ label, coords, timestamp }) => {
  const lat = Number(coords.latitude);
  const lng = Number(coords.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : null;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>

      {hasCoords ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#A41821] hover:underline"
          title="Open in Google Maps"
        >
          <span>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
          <svg
            className="h-3.5 w-3.5 shrink-0 opacity-70 transition group-hover:opacity-100"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      ) : (
        <p className="mt-1 font-mono text-xs font-semibold text-slate-400">Invalid coordinates</p>
      )}

      {coords.accuracyMeters !== null && coords.accuracyMeters !== undefined && (
        <p className="mt-0.5 text-[11px] text-slate-400">
          Accuracy ±{Math.round(coords.accuracyMeters)} m
        </p>
      )}

      {timestamp && (
        <p className="mt-0.5 text-[11px] text-slate-400">
          {new Date(timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
};

const EmptyLocationBlock = ({ label }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-3">
    <p className="text-[11px] font-semibold text-slate-400">{label}</p>
    <p className="mt-1 text-xs text-slate-400">Not captured</p>
  </div>
);

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
          aria-label="Close dialog"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
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

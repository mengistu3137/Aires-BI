import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useObservation } from "../hooks/useObservation.js";
import { useApproveObservation, useRejectObservation } from "../hooks/useObservationMutations.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useOnlineStatus } from "@/hooks/useOnlineStatus.js";
import { getQueuedObservationById, formatQueuedObservation } from "../offline/observationQueue.js";
import {
  getAvailabilityBadgeLabel,
  getAvailabilityColors,
  formatPrice,
  formatCapturedAt,
} from "../utils/observation.utils.js";
import { ObservationSyncBadge } from "../components/ObservationSyncBadge.jsx";
import { ObservationReviewBadge } from "../components/ObservationReviewBadge.jsx";
import { formatProductName } from "@/utils/formatters.js";

const rejectSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .min(3, "Note must be at least 3 characters")
    .max(1000, "Note cannot exceed 1000 characters"),
});

export const ObservationDetailPage = () => {
  const { observationId } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const isOnline = useOnlineStatus();

  const { data: serverObservation, isLoading, isError, error } = useObservation(observationId);

  // If the server doesn't have this observation (e.g. it hasn't synced yet,
  // or we're offline and it was never cached), fall back to the local
  // offline queue so a device that just captured this reading can still
  // open its own detail page instead of seeing "not found".
  const [queuedFallback, setQueuedFallback] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!observationId || serverObservation) {
      setQueuedFallback(null);
      return undefined;
    }
    getQueuedObservationById(observationId)
      .then((record) => {
        if (!cancelled) setQueuedFallback(formatQueuedObservation(record));
      })
      .catch(() => {
        if (!cancelled) setQueuedFallback(null);
      });
    return () => {
      cancelled = true;
    };
  }, [observationId, serverObservation]);

  const observation = serverObservation || queuedFallback;
  const isUnsynced = !serverObservation && Boolean(queuedFallback);

  const approveMutation = useApproveObservation();
  const rejectMutation = useRejectObservation();

  const [showRejectModal, setShowRejectModal] = useState(false);

  const rejectForm = useForm({ resolver: zodResolver(rejectSchema) });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if ((isError || !serverObservation) && !observation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div
          className={`rounded-xl border p-6 text-center ${
            !isOnline ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"
          }`}
        >
          <p className={`text-sm font-bold ${!isOnline ? "text-amber-800" : "text-[#A41821]"}`}>
            {!isOnline
              ? "You're offline and this observation hasn't loaded yet. It will load automatically once you're back online."
              : error?.message || "Observation not found"}
          </p>
          <button
            type="button"
            onClick={() => navigate("/observations")}
            className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
          >
            Back to observations
          </button>
        </div>
      </div>
    );
  }

  const colors = getAvailabilityColors(observation.availability);
  const product = observation.product;
  const audit = observation.audit;
  const auditor = observation.auditor;
  const review = observation.review;
  const sync = observation.sync;

  const isPending = review?.status === "PENDING";
  const canApprove = isManager && isPending && !isUnsynced;
  const canReject = isManager && isPending && !isUnsynced;

  const handleApprove = async () => {
    if (!navigator.onLine) {
      toast.error("You're offline — reconnect to approve this observation.");
      return;
    }
    try {
      await approveMutation.mutateAsync(observationId);
    } catch (err) {
      toast.error(err?.message || "Failed to approve observation");
    }
  };

  const handleReject = async (data) => {
    if (!navigator.onLine) {
      toast.error("You're offline — reconnect to reject this observation.");
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        observationId,
        reviewNote: data.reviewNote,
      });
      setShowRejectModal(false);
      rejectForm.reset();
    } catch (err) {
      toast.error(err?.message || "Failed to reject observation");
    }
  };

  const hasReviewSection = review && review.status !== "PENDING";
  const hasSyncSection = sync && sync.status && sync.status !== "SYNCED";

  const isAvailable =
    observation.availability === "AVAILABLE" &&
    observation.price !== null &&
    observation.price !== undefined;

  return (
    <div className="pb-28">
      {/* Sticky bar — back only */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Observation
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        {!isOnline && (
          <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 sm:mx-6">
            <span className="font-bold">Offline:</span> showing the last loaded data. Review actions
            are unavailable until you're back online.
          </div>
        )}
        {isUnsynced && (
          <div className="mx-4 mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600 sm:mx-6">
            <span className="font-bold">Not yet synced:</span> this observation is still saved
            locally on the collecting device and hasn't reached the server. Details below may be
            incomplete until it syncs.
          </div>
        )}

        {/* Hero — product + price */}
        <div className="border-b border-slate-200 px-4 pb-5 pt-4 sm:px-6 sm:pt-5">
          <h2 className="text-lg font-black  text-slate-900 sm:text-xl capitalize">
            {formatProductName(product?.name) || "Unknown product"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {product?.category}
            {product?.sku && ` · SKU ${product.sku}`}
            {product?.barcode && ` · ${product.barcode}`}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              {getAvailabilityBadgeLabel(observation.availability)}
            </span>
            <ObservationSyncBadge status={sync?.status} />
            <ObservationReviewBadge status={review?.status} />
          </div>

          {/* Big observed value */}
          <div className="mt-5">
            {isAvailable ? (
              <p className="text-xl font-black leading-none text-[#017C4D] sm:text-xl">
                {formatPrice(observation.price)}
              </p>
            ) : (
              <p className="text-xl font-black leading-none text-slate-500 sm:text-xl">
                {getAvailabilityBadgeLabel(observation.availability) || "—"}
              </p>
            )}
            <p className="mt-2 text-[11px] text-slate-500">
              Captured {formatCapturedAt(observation.capturedAt)}
            </p>
          </div>
        </div>

        {/* Collected during */}
        {(audit || observation.auditId) && (
          <Section title="Collected during">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {audit?.store?.name || "Unknown store"}
                </p>
                {audit?.store?.competitor && (
                  <p className="mt-0.5 truncate text-[11px] font-medium text-[#A41821]">
                    {audit.store.competitor.name}
                  </p>
                )}
              </div>
              {observation.auditId && (
                <button
                  type="button"
                  onClick={() => navigate(`/audits/${observation.auditId}`)}
                  className="shrink-0 text-[11px] font-bold text-[#A41821] hover:underline"
                >
                  View audit →
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Auditor */}
        {auditor && (
          <Section title="Auditor">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
                {auditor.name?.slice(0, 2).toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{auditor.name}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {auditor.role === "FIELD_AUDITOR"
                    ? "Field Auditor"
                    : auditor.role === "MANAGER"
                      ? "Pricing Manager"
                      : "Administrator"}
                  {auditor.phone && ` · ${auditor.phone}`}
                </p>
              </div>
            </div>
          </Section>
        )}

        {/* Review (only when decided) */}
        {hasReviewSection && (
          <Section
            title="Review"
            accent={
              review.status === "APPROVED"
                ? "positive"
                : review.status === "REJECTED"
                  ? "negative"
                  : "warning"
            }
          >
            <dl className="divide-y divide-slate-100">
              <Row
                label="Status"
                value={review.status.replace("_", " ")}
                tone={
                  review.status === "APPROVED"
                    ? "positive"
                    : review.status === "REJECTED"
                      ? "negative"
                      : "warning"
                }
              />
              {review.reviewedBy && (
                <Row
                  label="Reviewed by"
                  value={`${review.reviewedBy.name} (${review.reviewedBy.role})`}
                />
              )}
              {review.reviewedAt && (
                <Row label="Reviewed at" value={formatCapturedAt(review.reviewedAt)} />
              )}
              {review.reviewNote && <Row label="Note" value={review.reviewNote} />}
            </dl>
          </Section>
        )}

        {/* Sync (only when not fully synced) */}
        {hasSyncSection && (
          <Section title="Sync" accent="warning">
            <dl className="divide-y divide-slate-100">
              <Row label="Status" value={sync.status} />
              <Row label="Attempts" value={String(sync.attempts ?? 0)} />
              {sync.syncedAt && <Row label="Synced at" value={formatCapturedAt(sync.syncedAt)} />}
              {sync.error && <Row label="Error" value={sync.error} tone="negative" />}
            </dl>
          </Section>
        )}

        {/* Notes */}
        {observation.notes && (
          <Section title="Notes">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
              {observation.notes}
            </p>
          </Section>
        )}

        {/* Evidence */}
        {observation.evidencePhotoUrl && (
          <Section title="Evidence">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <img
                src={observation.evidencePhotoUrl}
                alt="Evidence"
                className="w-full object-cover"
                loading="lazy"
              />
            </div>
          </Section>
        )}
      </div>

      {/* Sticky action bar — reject / approve */}
      {isManager && (canApprove || canReject) && (
        <div className="sticky bottom-0 z-20 border-t border-slate-200">
          <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
            {!isOnline && (
              <p className="mb-2 text-center text-[10px] font-semibold text-amber-700">
                You're offline — reconnect to approve or reject.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              {canApprove && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending || !isOnline}
                  className="flex-1 rounded-xl bg-[#017C4D] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#015E3A] active:scale-[0.99] disabled:opacity-50 sm:py-2.5 sm:text-xs"
                >
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </button>
              )}
              {canReject && (
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={!isOnline}
                  className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-[#A41821] transition hover:bg-red-100 active:scale-[0.99] disabled:opacity-50 sm:py-2.5 sm:text-xs"
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && (
        <Modal title="Reject observation" onClose={() => setShowRejectModal(false)}>
          <form onSubmit={rejectForm.handleSubmit(handleReject)} className="mt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Reason for rejection *
            </label>
            <textarea
              rows={3}
              autoFocus
              {...rejectForm.register("reviewNote")}
              placeholder="Explain why this observation is being rejected..."
              className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden"
            />
            {rejectForm.formState.errors.reviewNote && (
              <p className="mt-1 text-xs font-medium text-[#A41821]">
                {rejectForm.formState.errors.reviewNote.message}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejectMutation.isPending}
                className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white hover:bg-[#7F1219] disabled:opacity-50"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Confirm reject"}
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

const Section = ({ title, accent, children }) => {
  const accentBorder =
    accent === "positive"
      ? "border-l-[#017C4D]"
      : accent === "negative"
        ? "border-l-[#A41821]"
        : accent === "warning"
          ? "border-l-[#FE7914]"
          : "border-l-transparent";

  return (
    <section
      className={`border-b border-slate-200 px-4 py-4 sm:px-6 ${
        accent ? `border-l-2 pl-3 sm:pl-5 ${accentBorder}` : ""
      }`}
    >
      <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {title}
      </h2>
      {children}
    </section>
  );
};

const Row = ({ label, value, tone }) => {
  const toneClasses =
    tone === "positive"
      ? "text-[#017C4D]"
      : tone === "negative"
        ? "text-[#A41821]"
        : tone === "warning"
          ? "text-[#FE7914]"
          : "text-slate-700";

  return (
    <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className={`max-w-[65%] break-words text-right text-xs font-semibold ${toneClasses}`}>
        {value}
      </dd>
    </div>
  );
};

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
    <div className="relative w-full max-w-md rounded-t-2xl border border-slate-200 bg-white p-4 shadow-xl sm:rounded-2xl">
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

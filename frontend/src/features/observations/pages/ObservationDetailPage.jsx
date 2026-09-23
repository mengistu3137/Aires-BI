import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useObservation } from "../hooks/useObservation.js";
import {
  useApproveObservation,
  useRejectObservation,
  useRequestObservationReview,
} from "../hooks/useObservationMutations.js";
import { useAuth } from "@/hooks/useAuth.js";
import {
  getAvailabilityBadgeLabel,
  getAvailabilityColors,
  formatPrice,
  formatCapturedAt,
} from "../utils/observation.utils.js";
import { ObservationSyncBadge } from "../components/ObservationSyncBadge.jsx";
import { ObservationReviewBadge } from "../components/ObservationReviewBadge.jsx";

const reviewNoteSchema = z.object({
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

  const { data: observation, isLoading, isError, error } = useObservation(observationId);

  const approveMutation = useApproveObservation();
  const rejectMutation = useRejectObservation();
  const requestReviewMutation = useRequestObservationReview();

  const [activeModal, setActiveModal] = useState(null); // 'reject' | 'review'

  const rejectForm = useForm({ resolver: zodResolver(reviewNoteSchema) });
  const reviewForm = useForm({ resolver: zodResolver(reviewNoteSchema) });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !observation) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">
          {error?.message || "Observation not found"}
        </p>
        <button
          type="button"
          onClick={() => navigate("/observations")}
          className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
        >
          Back to observations
        </button>
      </div>
    );
  }

  const colors = getAvailabilityColors(observation.availability);
  const product = observation.product;
  const audit = observation.audit;
  const auditor = observation.auditor;
  const review = observation.review;
  const sync = observation.sync;

  // Review permissions: ADMIN/MANAGER can act on PENDING observations only.
  // Backend enforces the same rule; these flags are just UI visibility.
  const isPending = review?.status === "PENDING";
  const canApprove = isManager && isPending;
  const canReject = isManager && isPending;
  const canRequestReview = isManager && isPending;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(observationId);
    } catch (err) {
      toast.error(err?.message || "Failed to approve observation");
    }
  };

  const handleReject = async (data) => {
    try {
      await rejectMutation.mutateAsync({
        observationId,
        reviewNote: data.reviewNote,
      });
      setActiveModal(null);
      rejectForm.reset();
    } catch (err) {
      toast.error(err?.message || "Failed to reject observation");
    }
  };

  const handleRequestReview = async (data) => {
    try {
      await requestReviewMutation.mutateAsync({
        observationId,
        reviewNote: data.reviewNote,
      });
      setActiveModal(null);
      reviewForm.reset();
    } catch (err) {
      toast.error(err?.message || "Failed to flag for review");
    }
  };

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header: Product + status badges */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h1 className="text-base font-black text-slate-800">
          {product?.name || "Unknown product"}
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {product?.category}
          {product?.sku && ` · SKU ${product.sku}`}
          {product?.barcode && ` · ${product.barcode}`}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
            {getAvailabilityBadgeLabel(observation.availability)}
          </span>
          <ObservationSyncBadge status={sync?.status} />
          <ObservationReviewBadge status={review?.status} />
        </div>
      </div>

      {/* Observation values */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Observed value
        </p>
        <dl className="mt-2 divide-y divide-slate-100">
          <DetailRow label="Price" value={formatPrice(observation.price)} bold />
          <DetailRow label="Observed unit" value={observation.observedUnit || "—"} />
          <DetailRow label="Package size" value={observation.packageSize || "—"} />
          <DetailRow label="Captured at" value={formatCapturedAt(observation.capturedAt)} />
        </dl>
      </div>

      {/* Store & Audit context */}
      {(audit || observation.auditId) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Collected during
          </p>
          <div className="mt-2">
            <p className="text-sm font-bold text-slate-800">
              {audit?.store?.name || "Unknown store"}
            </p>
            {audit?.store?.competitor && (
              <p className="mt-0.5 text-[11px] font-semibold text-[#A41821]">
                {audit.store.competitor.name}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {observation.auditId && (
                <button
                  type="button"
                  onClick={() => navigate(`/audits/${observation.auditId}`)}
                  className="text-[11px] font-bold text-[#A41821] hover:underline"
                >
                  View full audit visit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auditor */}
      {auditor && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Auditor</p>
          <div className="mt-2 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-white">
              {auditor.name?.slice(0, 2).toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">{auditor.name}</p>
              <p className="text-[11px] text-slate-500">
                {auditor.role === "FIELD_AUDITOR"
                  ? "Field Auditor"
                  : auditor.role === "MANAGER"
                    ? "Pricing Manager"
                    : "Administrator"}
              </p>
              {auditor.phone && (
                <p className="mt-0.5 text-[11px] text-slate-500">{auditor.phone}</p>
              )}
              {auditor.email && (
                <p className="mt-0.5 truncate text-[11px] text-slate-400">{auditor.email}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review section — only if reviewed */}
      {review && review.status !== "PENDING" && (
        <div
          className={`rounded-2xl border p-4 shadow-xs ${
            review.status === "APPROVED"
              ? "border-emerald-200 bg-emerald-50/50"
              : review.status === "REJECTED"
                ? "border-red-200 bg-red-50/50"
                : "border-amber-200 bg-amber-50/50"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Review</p>
          <dl className="mt-2 divide-y divide-slate-100">
            <DetailRow label="Status" value={review.status} />
            {review.reviewedBy && (
              <DetailRow
                label="Reviewed by"
                value={`${review.reviewedBy.name} (${review.reviewedBy.role})`}
              />
            )}
            {review.reviewedAt && (
              <DetailRow label="Reviewed at" value={formatCapturedAt(review.reviewedAt)} />
            )}
            {review.reviewNote && <DetailRow label="Note" value={review.reviewNote} />}
          </dl>
        </div>
      )}

      {/* Sync info */}
      {sync && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Sync information
          </p>
          <dl className="mt-2 divide-y divide-slate-100">
            <DetailRow label="Status" value={sync.status || "—"} />
            <DetailRow label="Attempts" value={String(sync.attempts ?? 0)} />
            {sync.syncedAt && (
              <DetailRow label="Synced at" value={formatCapturedAt(sync.syncedAt)} />
            )}
            {sync.error && <DetailRow label="Error" value={sync.error} />}
          </dl>
        </div>
      )}

      {/* Notes */}
      {observation.notes && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
          <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{observation.notes}</p>
        </div>
      )}

      {/* Evidence */}
      {observation.evidencePhotoUrl && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Evidence</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
            <img
              src={observation.evidencePhotoUrl}
              alt="Evidence"
              className="w-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Review actions — ADMIN / MANAGER only, PENDING only */}
      {isManager && (canApprove || canReject || canRequestReview) && (
        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
            <div className="flex flex-col gap-2 sm:flex-row">
              {canApprove && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex-1 rounded-xl bg-[#017C4D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#015E3A] disabled:opacity-50"
                >
                  {approveMutation.isPending ? "Approving..." : "Approve"}
                </button>
              )}
              {canRequestReview && (
                <button
                  type="button"
                  onClick={() => setActiveModal("review")}
                  className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-[#FE7914] transition hover:bg-amber-100"
                >
                  Request review
                </button>
              )}
              {canReject && (
                <button
                  type="button"
                  onClick={() => setActiveModal("reject")}
                  className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-[#A41821] transition hover:bg-red-100"
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {activeModal === "reject" && (
        <Modal title="Reject observation" onClose={() => setActiveModal(null)}>
          <form onSubmit={rejectForm.handleSubmit(handleReject)} className="mt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Reason for rejection *
            </label>
            <textarea
              rows={3}
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
                onClick={() => setActiveModal(null)}
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

      {/* Request review modal */}
      {activeModal === "review" && (
        <Modal title="Request supervisor review" onClose={() => setActiveModal(null)}>
          <form onSubmit={reviewForm.handleSubmit(handleRequestReview)} className="mt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Review note *
            </label>
            <textarea
              rows={3}
              {...reviewForm.register("reviewNote")}
              placeholder="Explain what needs review..."
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
                disabled={requestReviewMutation.isPending}
                className="rounded-xl bg-[#FE7914] px-4 py-2 text-xs font-bold text-white hover:bg-[#D45F06] disabled:opacity-50"
              >
                {requestReviewMutation.isPending ? "Submitting..." : "Flag for review"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const DetailRow = ({ label, value, bold = false }) => (
  <div className="flex items-start justify-between gap-3 py-2.5">
    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
    <dd
      className={`max-w-[60%] text-right text-xs ${
        bold ? "font-black text-slate-800" : "font-semibold text-slate-700"
      }`}
    >
      {value}
    </dd>
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

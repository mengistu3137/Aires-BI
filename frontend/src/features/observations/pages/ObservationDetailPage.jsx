import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { useObservation } from "../hooks/useObservation.js";
import { useObservations } from "../hooks/useObservations.js";
import {
	useApproveObservation,
	useRejectObservation,
} from "../hooks/useObservationMutations.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useOnlineStatus } from "@/hooks/useOnlineStatus.js";
import {
	getQueuedObservationById,
	formatQueuedObservation,
} from "../offline/observationQueue.js";
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

	const {
		data: serverObservation,
		isLoading,
		isError,
		error,
	} = useObservation(observationId);

	// Fetch queue of pending observations for rapid sequential review
	const { data: pendingData } = useObservations(
		isManager ? { reviewStatus: "PENDING", limit: 100 } : {},
	);
	const pendingList = pendingData?.observations || [];

	const currentIndex = useMemo(() => {
		return pendingList.findIndex((item) => item.id === observationId);
	}, [pendingList, observationId]);

	const nextObservationId = useMemo(() => {
		if (currentIndex >= 0 && currentIndex < pendingList.length - 1) {
			return pendingList[currentIndex + 1].id;
		}
		// If approving the first or current, get the other pending item
		const remaining = pendingList.filter((item) => item.id !== observationId);
		return remaining.length > 0 ? remaining[0].id : null;
	}, [pendingList, currentIndex, observationId]);

	const prevObservationId = useMemo(() => {
		if (currentIndex > 0) {
			return pendingList[currentIndex - 1].id;
		}
		return null;
	}, [pendingList, currentIndex]);

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

	const isPending = observation?.review?.status === "PENDING";
	const canApprove = isManager && isPending && !isUnsynced;
	const canReject = isManager && isPending && !isUnsynced;

	// Advance to next without creating duplicate toast notifications
	const advanceToNext = () => {
		if (nextObservationId) {
			navigate(`/observations/${nextObservationId}`, { replace: true });
		} else {
			toast.success("All pending observations reviewed!", {
				id: "observation-review-toast",
				duration: 2500,
			});
			navigate("/observations", { replace: true });
		}
	};

	const handleApprove = async () => {
		if (!navigator.onLine) {
			toast.error("You're offline — reconnect to approve this observation.", {
				id: "observation-review-toast",
			});
			return;
		}
		try {
			await approveMutation.mutateAsync(observationId);
			advanceToNext();
		} catch (err) {
			toast.error(err?.message || "Failed to approve observation", {
				id: "observation-review-toast",
			});
		}
	};

	const handleReject = async (data) => {
		if (!navigator.onLine) {
			toast.error("You're offline — reconnect to reject this observation.", {
				id: "observation-review-toast",
			});
			return;
		}
		try {
			await rejectMutation.mutateAsync({
				observationId,
				reviewNote: data.reviewNote,
			});
			setShowRejectModal(false);
			rejectForm.reset();
			advanceToNext();
		} catch (err) {
			toast.error(err?.message || "Failed to reject observation", {
				id: "observation-review-toast",
			});
		}
	};

	// Keyboard shortcut: Press <Enter> to approve immediately
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (showRejectModal) return;
			const activeTag = document.activeElement?.tagName?.toLowerCase();
			if (activeTag === "input" || activeTag === "textarea") return;

			if (e.key === "Enter" && canApprove && !approveMutation.isPending) {
				e.preventDefault();
				handleApprove();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [showRejectModal, canApprove, approveMutation.isPending, observationId]);

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
						!isOnline
							? "border-amber-200 bg-amber-50"
							: "border-red-200 bg-red-50"
					}`}
				>
					<p
						className={`text-sm font-bold ${!isOnline ? "text-amber-800" : "text-[#A41821]"}`}
					>
						{!isOnline
							? "You're offline and this observation hasn't loaded yet."
							: error?.message || "Observation not found"}
					</p>
					<button
						type="button"
						onClick={() => navigate("/observations")}
						className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white cursor-pointer"
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

	const hasReviewSection = review && review.status !== "PENDING";
	const hasSyncSection = sync && sync.status && sync.status !== "SYNCED";

	const isAvailable =
		observation.availability === "AVAILABLE" &&
		observation.price !== null &&
		observation.price !== undefined;

	return (
		<div className="pb-28">
			{/* Sticky Bar with Sequential Tracker & Rapid Navigation */}
			<div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
				<div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => navigate("/observations")}
							className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
						>
							← Back
						</button>

						{/* Queue Counter Badge */}
						{currentIndex >= 0 && (
							<span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-[#FE7914]">
								Item {currentIndex + 1} of {pendingList.length} Pending
							</span>
						)}
					</div>

					{/* Quick Prev / Next Controls */}
					{pendingList.length > 1 && (
						<div className="flex items-center gap-1.5">
							<button
								type="button"
								disabled={!prevObservationId}
								onClick={() => navigate(`/observations/${prevObservationId}`)}
								className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
							>
								◀ Prev
							</button>
							<button
								type="button"
								disabled={!nextObservationId}
								onClick={() => navigate(`/observations/${nextObservationId}`)}
								className="cursor-pointer rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
							>
								Skip ▶
							</button>
						</div>
					)}
				</div>
			</div>

			<div className="mx-auto max-w-3xl">
				{!isOnline && (
					<div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 sm:mx-6">
						<span className="font-bold">Offline:</span> review actions are
						unavailable until you're back online.
					</div>
				)}

				{/* Hero: Product + Price */}
				<div className="border-b border-slate-200 px-4 pb-5 pt-4 sm:px-6 sm:pt-5">
					<h1 className="text-lg font-black text-slate-900 sm:text-xl capitalize">
						{formatProductName(product?.name) || "Unknown product"}
					</h1>
					<p className="mt-1 text-xs text-slate-500 font-medium">
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

					<div className="mt-5">
						{isAvailable ? (
							<p className="font-mono text-2xl font-black text-[#017C4D]">
								{formatPrice(observation.price)}
							</p>
						) : (
							<p className="font-mono text-xl font-bold text-slate-500">
								{getAvailabilityBadgeLabel(observation.availability) || "—"}
							</p>
						)}
						<p className="mt-1.5 text-[11px] text-slate-400 font-medium">
							Captured {formatCapturedAt(observation.capturedAt)}
						</p>
					</div>
				</div>

				{/* Audit Store Context */}
				{(audit || observation.auditId) && (
					<Section title="Collected during">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-bold text-slate-900">
									{audit?.store?.name || "Unknown store"}
								</p>
								{audit?.store?.competitor && (
									<p className="mt-0.5 truncate text-[11px] font-bold text-[#A41821]">
										{audit.store.competitor.name}
									</p>
								)}
							</div>
							{observation.auditId && (
								<button
									type="button"
									onClick={() => navigate(`/audits/${observation.auditId}`)}
									className="shrink-0 text-[11px] font-bold text-[#A41821] hover:underline cursor-pointer"
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
								<p className="truncate text-sm font-semibold text-slate-900">
									{auditor.name}
								</p>
								<p className="truncate text-[11px] text-slate-500">
									{auditor.role} {auditor.phone && ` · ${auditor.phone}`}
								</p>
							</div>
						</div>
					</Section>
				)}

				{/* Notes */}
				{observation.notes && (
					<Section title="Auditor notes">
						<p className="whitespace-pre-wrap text-xs text-slate-700">
							{observation.notes}
						</p>
					</Section>
				)}

				{/* Evidence Photo */}
				{observation.evidencePhotoUrl && (
					<Section title="Evidence photo">
						<div className="overflow-hidden rounded-xl border border-slate-200">
							<img
								src={observation.evidencePhotoUrl}
								alt="Evidence"
								className="w-full object-cover max-h-96"
								loading="lazy"
							/>
						</div>
					</Section>
				)}
			</div>

			{/* High-Speed Action Sticky Bar with Enter Hint */}
			{isManager && (canApprove || canReject) && (
				<div className="sticky bottom-0 z-20 overflow-hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-md shadow-lg shadow-slate-900/5">
					{/* Ultra-thin 1.5px Aires brand hairline */}
					<div className="h-[1.5px] w-full bg-gradient-to-r from-[#A41821] to-[#CC242F] shadow-[0_1px_3px_rgba(164,24,33,0.2)]" />

					<div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
						<div className="flex flex-col-reverse sm:flex-row items-center gap-2.5">
							{/* Reject Action: Aires Primary Red Outlined */}
							{canReject && (
								<button
									type="button"
									onClick={() => setShowRejectModal(true)}
									disabled={!isOnline}
									className="w-full sm:w-36 flex cursor-pointer items-center justify-center rounded-xl border border-[#A41821]/25 bg-red-50/70 px-4 py-3 text-xs font-bold text-[#A41821] transition hover:bg-[#A41821] hover:text-white active:scale-[0.99] disabled:opacity-40 sm:py-2.5"
								>
									Reject...
								</button>
							)}

							{/* Approve Action: Aires Secondary Green Filled */}
							{canApprove && (
								<button
									type="button"
									onClick={handleApprove}
									disabled={approveMutation.isPending || !isOnline}
									className="flex-1 w-full flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#017C4D] px-4 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#015E3A] active:scale-[0.99] disabled:opacity-40 sm:py-2.5 sm:text-xs"
								>
									<span>
										{approveMutation.isPending
											? "Approving..."
											: "Approve & Next"}
									</span>
									<kbd className="inline-flex items-center rounded-md border border-white/20 bg-white/20 px-2 py-0.5 font-mono text-[10px] font-bold text-white tracking-wide">
										↵ Enter
									</kbd>
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Reject Modal */}
			{showRejectModal && (
				<Modal
					title="Reject observation"
					onClose={() => setShowRejectModal(false)}
				>
					<form
						onSubmit={rejectForm.handleSubmit(handleReject)}
						className="mt-2 space-y-3"
					>
						<div>
							<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Reason for rejection *
							</label>
							<textarea
								rows={3}
								autoFocus
								{...rejectForm.register("reviewNote")}
								placeholder="Explain why this price observation is invalid..."
								className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs focus:border-[#A41821] focus:bg-white focus:outline-hidden"
							/>
							{rejectForm.formState.errors.reviewNote && (
								<p className="mt-1 text-xs font-semibold text-[#A41821]">
									{rejectForm.formState.errors.reviewNote.message}
								</p>
							)}
						</div>

						<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
							<button
								type="button"
								onClick={() => setShowRejectModal(false)}
								className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={rejectMutation.isPending}
								className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white hover:bg-[#7F1219] disabled:opacity-50 cursor-pointer"
							>
								{rejectMutation.isPending
									? "Rejecting..."
									: "Confirm Reject & Next"}
							</button>
						</div>
					</form>
				</Modal>
			)}
		</div>
	);
};

const Section = ({ title, children }) => (
	<section className="border-b border-slate-200 px-4 py-4 sm:px-6">
		<h2 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
			{title}
		</h2>
		{children}
	</section>
);

const Modal = ({ title, children, onClose }) => (
	<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div
			className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
			onClick={onClose}
		/>
		<div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
			<div className="mb-2 flex items-center justify-between">
				<h3 className="text-sm font-bold text-slate-800">{title}</h3>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
				>
					✕
				</button>
			</div>
			{children}
		</div>
	</div>
);
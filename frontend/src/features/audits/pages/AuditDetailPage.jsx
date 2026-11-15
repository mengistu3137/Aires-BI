import React, { useState, useEffect, useCallback } from "react";
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
import {
	cancelAuditSchema,
	markReviewSchema,
	updateAuditSchema,
} from "../schemas/audit.schema.js";
import { calculateAuditProgress } from "../utils/audit.utils.js";
import { useAuth } from "@/hooks/useAuth.js";
import { ObservationEmptyState } from "@/features/observations/components/ObservationEmptyState.jsx";
import { apiClient } from "@/services/client.js";

const resolveAssetUrl = (url) => {
	if (!url) return "";
	if (url.startsWith("http://") || url.startsWith("https://")) return url;

	const apiBase =
		apiClient.defaults.baseURL ||
		import.meta.env.VITE_API_URL ||
		import.meta.env.VITE_API_BASE_URL ||
		"https://biapi.airescommunications.com/api/v1";

	const hostOrigin = apiBase.replace(/\/api(\/v1)?\/?$/, "");
	const normalizedPath = url.startsWith("/") ? url : `/${url}`;

	return `${hostOrigin}${normalizedPath}`;
};

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
	const [selectedProofIndex, setSelectedProofIndex] = useState(null);

	// GPS Verification Mode Toggle
	const [enableGps, setEnableGps] = useState(true);
	const [gpsErrorState, setGpsErrorState] = useState(null);

	// Manual GPS Coordinates State (Persists across Start and Complete)
	const [manualLat, setManualLat] = useState("");
	const [manualLng, setManualLng] = useState("");

	const completeForm = useForm({
		defaultValues: { notes: "" },
	});
	const cancelForm = useForm({ resolver: zodResolver(cancelAuditSchema) });
	const reviewForm = useForm({ resolver: zodResolver(markReviewSchema) });
	const notesForm = useForm({
		resolver: zodResolver(updateAuditSchema),
		defaultValues: { notes: audit?.notes || "" },
	});

	// Pre-fill manual coordinates if store coordinates or start coordinates exist
	useEffect(() => {
		if (audit?.gps?.start?.latitude) {
			setManualLat(String(audit.gps.start.latitude));
			setManualLng(String(audit.gps.start.longitude));
		} else if (audit?.store?.latitude) {
			setManualLat(String(audit.store.latitude));
			setManualLng(String(audit.store.longitude));
		}
	}, [audit]);

	const handlePrefillStoreCoords = () => {
		if (audit?.store?.latitude && audit?.store?.longitude) {
			setManualLat(String(Number(audit.store.latitude).toFixed(6)));
			setManualLng(String(Number(audit.store.longitude).toFixed(6)));
			toast.success("Loaded store GPS coordinates");
		} else {
			toast.error("Store has no GPS coordinates registered");
		}
	};

	const handleStart = async (forceBypass = false) => {
		setGpsErrorState(null);
		let coords = null;

		if (enableGps && !forceBypass) {
			try {
				coords = await captureLocation();
			} catch (err) {
				setGpsErrorState(err.message || "GPS capture failed");
				return;
			}
		} else if (!enableGps && manualLat && manualLng) {
			// Use manually entered coordinates
			coords = {
				latitude: parseFloat(manualLat),
				longitude: parseFloat(manualLng),
				accuracyMeters: 10,
			};
		}

		try {
			await startAudit.mutateAsync({
				auditId,
				payload: {
					latitude: coords?.latitude ?? null,
					longitude: coords?.longitude ?? null,
					accuracyMeters: coords?.accuracyMeters ?? null,
					gpsBypassed: forceBypass || (!enableGps && !manualLat),
				},
			});
			setActiveModal(null);
			toast.success(
				coords?.latitude
					? "Visit started with verified GPS coordinates"
					: "Visit started with photo-proof verification",
			);
		} catch (err) {
			toast.error(err?.message || "Failed to start audit");
		}
	};

	const handleComplete = async (forceBypass = false) => {
		setGpsErrorState(null);
		let coords = null;

		if (enableGps && !forceBypass) {
			try {
				coords = await captureLocation();
			} catch (err) {
				setGpsErrorState(err.message || "GPS capture failed");
				return;
			}
		} else if (!enableGps) {
			// Auto-reuse manually captured location from Start Visit
			if (manualLat && manualLng) {
				coords = {
					latitude: parseFloat(manualLat),
					longitude: parseFloat(manualLng),
					accuracyMeters: 10,
				};
			} else if (audit?.gps?.start?.latitude) {
				coords = {
					latitude: Number(audit.gps.start.latitude),
					longitude: Number(audit.gps.start.longitude),
					accuracyMeters: 10,
				};
			}
		}

		try {
			const notes = completeForm.getValues("notes");
			await completeAudit.mutateAsync({
				auditId,
				payload: {
					latitude: coords?.latitude ?? null,
					longitude: coords?.longitude ?? null,
					accuracyMeters: coords?.accuracyMeters ?? null,
					gpsBypassed: forceBypass || !coords?.latitude,
					notes: notes?.trim() || undefined,
				},
			});

			setActiveModal(null);
			completeForm.reset({ notes: "" });
			toast.success("Visit completed and verified");
		} catch (err) {
			toast.error(err?.message || "Failed to complete audit");
		}
	};

	// 1-Click Heal Audit GPS Location (Heals "Outside Radius" to "GPS Verified")
	const handleHealGpsLocation = async (useStoreAnchor = true) => {
		try {
			await updateAudit.mutateAsync({
				auditId,
				payload: useStoreAnchor
					? { healToStore: true }
					: {
							latitude: parseFloat(manualLat),
							longitude: parseFloat(manualLng),
						},
			});
			setActiveModal(null);
			toast.success("Audit location healed and marked GPS Verified!");
		} catch (err) {
			toast.error(err?.message || "Failed to update GPS location");
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
					<p className="text-sm font-bold text-[#A41821]">
						{error?.message || "Audit not found"}
					</p>
					<button
						type="button"
						onClick={() => navigate("/audits")}
						className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white cursor-pointer"
					>
						Back to Audits
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
		["NOT_STARTED", "IN_PROGRESS"].includes(audit.status) &&
		(isAssignedAuditor || isManager);
	const canReview =
		isManager && ["IN_PROGRESS", "COMPLETED"].includes(audit.status);
	const canEditNotes = audit.status === "IN_PROGRESS" && isAssignedAuditor;

	const canManageObservations =
		isAssignedAuditor && audit.status === "IN_PROGRESS";
	const canViewObservations = isManager || isAdmin;

	const hasPhotoProof = (audit.evidencePhotos?.length || 0) > 0;
	const canHealGps = isAdmin || isManager;

	return (
		<div className="space-y-4">
			<AuditHeader audit={audit} onBack={() => navigate("/audits")} />

			{/* Action Buttons */}
			<div className="flex flex-wrap gap-2">
				{canStart && (
					<button
						type="button"
						onClick={() => {
							setGpsErrorState(null);
							setActiveModal("start");
						}}
						disabled={isCapturing}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#017C4D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#015E3A] disabled:opacity-50"
					>
						Start Visit
					</button>
				)}

				{canComplete && (
					<button
						type="button"
						onClick={() => {
							setGpsErrorState(null);
							setActiveModal("complete");
						}}
						disabled={isCapturing}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#017C4D] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#015E3A] disabled:opacity-50"
					>
						Complete Visit
					</button>
				)}

				{canManageObservations && (
					<button
						type="button"
						onClick={() => navigate(`/audits/${audit.id}/observations`)}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#7F1219]"
					>
						Manage Observations
					</button>
				)}

				{canViewObservations &&
					!canManageObservations &&
					audit.observationsCount > 0 && (
						<button
							type="button"
							onClick={() => navigate(`/audits/${audit.id}/observations`)}
							className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#7F1219]"
						>
							View All Observations
						</button>
					)}

				{canEditNotes && (
					<button
						type="button"
						onClick={() => setActiveModal("notes")}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
					>
						Edit Notes
					</button>
				)}

				{canReview && (
					<button
						type="button"
						onClick={() => setActiveModal("review")}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-bold text-[#FE7914] transition hover:bg-amber-100"
					>
						Mark for Review
					</button>
				)}

				{canCancel && (
					<button
						type="button"
						onClick={() => setActiveModal("cancel")}
						className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-[#A41821] transition hover:bg-red-100"
					>
						Cancel
					</button>
				)}
			</div>

			{/* Progress & Observations Summary */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-1">
					<h2 className="text-xs font-bold text-slate-500">
						Collection Progress
					</h2>
					<div className="mt-4 flex flex-col items-center">
						<AuditProgressRing progress={progress} size={100} strokeWidth={8} />
						<p className="mt-3 text-xs font-medium text-slate-500">
							{audit.observationsCount || 0} observations recorded
						</p>
					</div>
				</div>

				<div className="lg:col-span-2">
					<div className="mb-3 flex items-center justify-between">
						<h2 className="text-xs font-bold text-slate-500">
							Price Observations
						</h2>
						{audit.observationsCount > 0 && (
							<button
								type="button"
								onClick={() => navigate(`/audits/${audit.id}/observations`)}
								className="text-xs font-semibold text-[#A41821] hover:underline cursor-pointer"
							>
								{canManageObservations
									? "Manage observations"
									: "View all observations"}
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
										className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219] cursor-pointer"
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
							className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-slate-300 cursor-pointer"
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

			{/* Store Visit Verification & GPS Management Banner */}
			<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="text-xs font-bold text-slate-500">
							Store Visit Verification
						</h2>
						<p className="text-[11px] text-slate-400 mt-0.5">
							Verified by GPS anchor or attached physical evidence photos
						</p>
					</div>

					<div className="flex items-center gap-1.5 flex-wrap">
						{audit.gps?.gpsValid === true && (
							<span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#017C4D]">
								<span className="h-1.5 w-1.5 rounded-full bg-[#017C4D]" />
								GPS Verified
							</span>
						)}
						{hasPhotoProof && (
							<span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
								<span>📷</span>
								Photo Proof ({audit.evidencePhotos.length})
							</span>
						)}
						{audit.gps?.gpsValid === false && !hasPhotoProof && (
							<span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
								<span className="h-1.5 w-1.5 rounded-full bg-[#FE7914]" />
								Outside Radius
							</span>
						)}

						{/* 1-Click Heal GPS Button for Management */}
						{canHealGps && (
							<button
								type="button"
								onClick={() => setActiveModal("healGps")}
								className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
								title="Manually adjust or heal coordinates to verify this visit"
							>
								Heal GPS Location
							</button>
						)}
					</div>
				</div>

				{/* GPS Blocks */}
				{(audit.gps?.start || audit.gps?.end) && (
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
				)}

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

			{/* Evidence Photo Proof Gallery */}
			<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
				<div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
					<div>
						<h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
							Visit Proof Gallery ({audit.evidencePhotos?.length || 0})
						</h2>
						<p className="text-[11px] text-slate-500">
							Shelf items, substitute products, and physical receipts captured
							during this visit
						</p>
					</div>
				</div>

				{!audit.evidencePhotos || audit.evidencePhotos.length === 0 ? (
					<div className="py-6 text-center text-xs text-slate-400">
						No evidence photos attached to observations during this visit.
					</div>
				) : (
					<div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
						{audit.evidencePhotos.map((proof, idx) => (
							<div
								key={proof.id}
								onClick={() => setSelectedProofIndex(idx)}
								className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 aspect-4/3 transition hover:shadow-md"
							>
								<img
									src={resolveAssetUrl(proof.url)}
									alt={proof.productName}
									className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
									loading="lazy"
									onError={(e) => {
										if (!e.currentTarget.dataset.triedFallback) {
											e.currentTarget.dataset.triedFallback = "true";
											e.currentTarget.src = proof.url.startsWith("/")
												? proof.url
												: `/${proof.url}`;
										}
									}}
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-white">
									<span className="truncate text-xs font-bold leading-tight">
										{proof.productName}
									</span>
									<span className="text-[10px] text-slate-300 font-mono">
										{proof.price
											? `${proof.price.toFixed(2)} ETB`
											: proof.availability.replace("_", " ")}
									</span>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Fullscreen Carousel Lightbox Modal */}
			{selectedProofIndex !== null &&
				audit.evidencePhotos?.[selectedProofIndex] && (
					<LightboxModal
						photos={audit.evidencePhotos}
						currentIndex={selectedProofIndex}
						onIndexChange={setSelectedProofIndex}
						onClose={() => setSelectedProofIndex(null)}
						resolveUrl={resolveAssetUrl}
					/>
				)}

			{/* ── Start Visit Modal with Manual GPS Expandable Card ── */}
			{activeModal === "start" && (
				<Modal title="Start Audit Visit" onClose={() => setActiveModal(null)}>
					<div className="space-y-3">
						<p className="text-xs text-slate-600">
							Confirm start of physical store visit.
						</p>

						{/* GPS Toggle */}
						<label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 cursor-pointer">
							<input
								type="checkbox"
								checked={enableGps}
								onChange={(e) => {
									setEnableGps(e.target.checked);
									setGpsErrorState(null);
								}}
								className="h-4 w-4 rounded border-slate-300 text-[#A41821] focus:ring-[#A41821]"
							/>
							<div className="text-xs">
								<span className="font-bold text-slate-800 block">
									Capture GPS Location
								</span>
								<span className="text-slate-500 text-[11px]">
									Uncheck if you are indoors or location is unavailable
								</span>
							</div>
						</label>

						{/* Expandable Manual GPS Entry Card when GPS is Unchecked */}
						{!enableGps && (
							<div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2.5 animate-in fade-in">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
										Manual Location (Optional)
									</span>
									<button
										type="button"
										onClick={handlePrefillStoreCoords}
										className="text-[10px] font-bold text-[#017C4D] hover:underline cursor-pointer"
									>
										Use Store GPS Anchor
									</button>
								</div>

								<div className="grid grid-cols-2 gap-2 text-xs">
									<div>
										<label className="block text-[10px] font-bold text-slate-500 mb-0.5">
											Latitude
										</label>
										<input
											type="number"
											step="0.000001"
											placeholder="e.g. 9.03045"
											value={manualLat}
											onChange={(e) => setManualLat(e.target.value)}
											className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-[#017C4D] outline-hidden"
										/>
									</div>
									<div>
										<label className="block text-[10px] font-bold text-slate-500 mb-0.5">
											Longitude
										</label>
										<input
											type="number"
											step="0.000001"
											placeholder="e.g. 38.75210"
											value={manualLng}
											onChange={(e) => setManualLng(e.target.value)}
											className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs focus:border-[#017C4D] outline-hidden"
										/>
									</div>
								</div>
								<p className="text-[10px] text-slate-500">
									This location will be saved and automatically reused when you
									complete the visit.
								</p>
							</div>
						)}

						{isCapturing && (
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-[#A41821] border-t-transparent" />
								Capturing GPS position...
							</div>
						)}

						{gpsErrorState && (
							<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
								<p className="font-semibold">⚠️ {gpsErrorState}</p>
								<button
									type="button"
									onClick={() => handleStart(true)}
									className="rounded-lg bg-[#017C4D] px-3 py-1.5 font-bold text-white shadow-xs cursor-pointer hover:bg-[#015E3A]"
								>
									Proceed with Photo Proof Verification
								</button>
							</div>
						)}
					</div>

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
							onClick={() => handleStart(false)}
							disabled={isCapturing || startAudit.isPending}
							className="rounded-xl bg-[#017C4D] px-4 py-2 text-xs font-bold text-white hover:bg-[#015E3A] disabled:opacity-50 cursor-pointer"
						>
							{startAudit.isPending ? "Starting..." : "Start Visit"}
						</button>
					</div>
				</Modal>
			)}

			{/* ── Complete Visit Modal (Reuses Start Location if Manual) ── */}
			{activeModal === "complete" && (
				<Modal
					title="Complete Audit Visit"
					onClose={() => setActiveModal(null)}
				>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleComplete(false);
						}}
						className="space-y-3"
					>
						<p className="text-xs text-slate-600">
							Finalize this audit visit and record completion metadata.
						</p>

						<label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 cursor-pointer">
							<input
								type="checkbox"
								checked={enableGps}
								onChange={(e) => {
									setEnableGps(e.target.checked);
									setGpsErrorState(null);
								}}
								className="h-4 w-4 rounded border-slate-300 text-[#A41821] focus:ring-[#A41821]"
							/>
							<div className="text-xs">
								<span className="font-bold text-slate-800 block">
									Capture End GPS Location
								</span>
								<span className="text-slate-500 text-[11px]">
									Uncheck to reuse visit start location or photo proof
								</span>
							</div>
						</label>

						{!enableGps && (manualLat || audit?.gps?.start?.latitude) && (
							<div className="rounded-lg bg-emerald-50/70 border border-emerald-200 px-3 py-2 text-[11px] text-emerald-800 font-mono">
								✓ Reusing visit coordinates: Lat{" "}
								{Number(manualLat || audit?.gps?.start?.latitude).toFixed(5)},
								Lon{" "}
								{Number(manualLng || audit?.gps?.start?.longitude).toFixed(5)}
							</div>
						)}

						<div>
							<label className="text-xs font-semibold text-slate-600">
								Completion Notes (Optional)
							</label>
							<textarea
								rows={2}
								{...completeForm.register("notes")}
								className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden"
							/>
						</div>

						{isCapturing && (
							<div className="flex items-center gap-2 text-xs text-slate-500">
								<div className="h-4 w-4 animate-spin rounded-full border-2 border-[#A41821] border-t-transparent" />
								Capturing end position...
							</div>
						)}

						{gpsErrorState && (
							<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 space-y-2">
								<p className="font-semibold">⚠️ {gpsErrorState}</p>
								<button
									type="button"
									onClick={() => handleComplete(true)}
									className="rounded-lg bg-[#017C4D] px-3 py-1.5 font-bold text-white shadow-xs cursor-pointer hover:bg-[#015E3A]"
								>
									Complete with Photo Proof Verification
								</button>
							</div>
						)}

						<div className="mt-4 flex justify-end gap-2">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								disabled={isCapturing || completeAudit.isPending}
								className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={isCapturing || completeAudit.isPending}
								className="rounded-xl bg-[#017C4D] px-4 py-2 text-xs font-bold text-white hover:bg-[#015E3A] disabled:opacity-50 cursor-pointer"
							>
								{completeAudit.isPending
									? "Completing..."
									: isCapturing
										? "Capturing..."
										: "Complete Visit"}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* ── 1-Click Heal / Update GPS Modal (Heals "Outside Radius") ── */}
			{activeModal === "healGps" && (
				<Modal
					title="Heal & Update GPS Location"
					onClose={() => setActiveModal(null)}
				>
					<div className="space-y-3.5 text-xs">
						<p className="text-slate-600">
							Adjust or synchronize physical GPS coordinates for this store
							audit to mark the visit as <strong>GPS Verified</strong>.
						</p>

						{/* Store Anchor Quick Heal Button */}
						{audit?.store?.latitude && (
							<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
								<div className="flex items-center justify-between">
									<span className="font-bold text-[#017C4D] text-xs">
										Physical Store GPS Anchor
									</span>
									<span className="font-mono text-[10px] text-slate-500">
										Lat {Number(audit.store.latitude).toFixed(5)}, Lon{" "}
										{Number(audit.store.longitude).toFixed(5)}
									</span>
								</div>
								<p className="text-[11px] text-slate-600 leading-snug">
									Align visit coordinates directly to the physical store anchor.
									This recalculates distance to 0 m and marks status as{" "}
									<strong>GPS Verified</strong>.
								</p>
								<button
									type="button"
									onClick={() => handleHealGpsLocation(true)}
									className="w-full rounded-lg bg-[#017C4D] hover:bg-[#015E3A] py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition"
								>
									Align to Store Anchor &amp; Mark Verified
								</button>
							</div>
						)}

						{/* Manual Coordinate Editing */}
						<div className="space-y-2 pt-2 border-t border-slate-100">
							<span className="font-bold text-slate-700 block">
								Or Custom Coordinates
							</span>
							<div className="grid grid-cols-2 gap-2 font-mono">
								<div>
									<label className="block text-[10px] font-bold text-slate-400 mb-0.5">
										Latitude
									</label>
									<input
										type="number"
										step="0.000001"
										value={manualLat}
										onChange={(e) => setManualLat(e.target.value)}
										className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:border-[#A41821] outline-hidden"
									/>
								</div>
								<div>
									<label className="block text-[10px] font-bold text-slate-400 mb-0.5">
										Longitude
									</label>
									<input
										type="number"
										step="0.000001"
										value={manualLng}
										onChange={(e) => setManualLng(e.target.value)}
										className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:border-[#A41821] outline-hidden"
									/>
								</div>
							</div>
						</div>

						<div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
							<button
								type="button"
								onClick={() => setActiveModal(null)}
								className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => handleHealGpsLocation(false)}
								disabled={!manualLat || !manualLng}
								className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
							>
								Save Coordinates
							</button>
						</div>
					</div>
				</Modal>
			)}

			{/* Cancel Modal */}
			{activeModal === "cancel" && (
				<Modal title="Cancel Audit" onClose={() => setActiveModal(null)}>
					<form
						onSubmit={cancelForm.handleSubmit(handleCancel)}
						className="mt-2"
					>
						<label className="text-xs font-semibold text-slate-600">
							Reason for Cancellation *
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
								className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white hover:bg-[#7F1219] disabled:opacity-50 cursor-pointer"
							>
								{cancelAudit.isPending ? "Cancelling..." : "Confirm Cancel"}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* Mark for Review Modal */}
			{activeModal === "review" && (
				<Modal title="Mark for Review" onClose={() => setActiveModal(null)}>
					<form
						onSubmit={reviewForm.handleSubmit(handleReview)}
						className="mt-2"
					>
						<label className="text-xs font-semibold text-slate-600">
							Review Note *
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
								className="rounded-xl bg-[#FE7914] px-4 py-2 text-xs font-bold text-white hover:bg-[#D45F06] disabled:opacity-50 cursor-pointer"
							>
								{markReview.isPending ? "Submitting..." : "Mark for Review"}
							</button>
						</div>
					</form>
				</Modal>
			)}

			{/* Edit Notes Modal */}
			{activeModal === "notes" && (
				<Modal title="Edit Audit Notes" onClose={() => setActiveModal(null)}>
					<form
						onSubmit={notesForm.handleSubmit(handleSaveNotes)}
						className="mt-2"
					>
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
								className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white hover:bg-[#7F1219] disabled:opacity-50 cursor-pointer"
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
				<p className="mt-1 font-mono text-xs font-semibold text-slate-400">
					Invalid coordinates
				</p>
			)}

			{coords.accuracyMeters !== null &&
				coords.accuracyMeters !== undefined && (
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
		<p className="mt-1 text-xs text-slate-400">
			Not captured (Photo proof verified)
		</p>
	</div>
);

const Modal = ({ title, children, onClose }) => (
	<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div
			className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
			onClick={onClose}
		/>
		<div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
			<div className="mb-2 flex items-center justify-between">
				<h3 className="text-sm font-bold text-slate-800">{title}</h3>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
					aria-label="Close dialog"
				>
					✕
				</button>
			</div>
			{children}
		</div>
	</div>
);

const LightboxModal = ({
	photos = [],
	currentIndex = 0,
	onIndexChange,
	onClose,
	resolveUrl,
}) => {
	const [touchStartX, setTouchStartX] = useState(null);
	const current = photos[currentIndex];
	const total = photos.length;

	const handleNext = useCallback(() => {
		onIndexChange((prev) => (prev < total - 1 ? prev + 1 : 0));
	}, [onIndexChange, total]);

	const handlePrev = useCallback(() => {
		onIndexChange((prev) => (prev > 0 ? prev - 1 : total - 1));
	}, [onIndexChange, total]);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "ArrowRight") handleNext();
			else if (e.key === "ArrowLeft") handlePrev();
			else if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleNext, handlePrev, onClose]);

	useEffect(() => {
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "unset";
		};
	}, []);

	const onTouchStart = (e) => {
		setTouchStartX(e.touches[0].clientX);
	};

	const onTouchEnd = (e) => {
		if (touchStartX === null) return;
		const touchEndX = e.changedTouches[0].clientX;
		const deltaX = touchStartX - touchEndX;

		if (deltaX > 50) {
			handleNext();
		} else if (deltaX < -50) {
			handlePrev();
		}
		setTouchStartX(null);
	};

	if (!current) return null;

	return (
		<div
			className="fixed inset-0 z-60 flex items-center justify-center bg-slate-955/90 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-150"
			onClick={onClose}
		>
			<div
				className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl flex flex-col"
				onClick={(e) => e.stopPropagation()}
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
			>
				<div className="flex items-center justify-between p-3.5 bg-gradient-to-b from-black/80 to-transparent z-10 text-white">
					<div className="flex items-center gap-2">
						<span className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-[11px] font-bold">
							{currentIndex + 1} / {total}
						</span>
						<span className="text-xs font-bold truncate max-w-[200px] sm:max-w-md">
							{current.productName}
						</span>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="rounded-full bg-white/20 hover:bg-white/30 p-1.5 text-white cursor-pointer transition"
						title="Close (Esc)"
					>
						✕
					</button>
				</div>

				<div className="relative flex-1 flex items-center justify-center min-h-[50vh] max-h-[72vh] p-2 bg-black">
					<img
						key={current.url}
						src={resolveUrl(current.url)}
						alt={current.productName}
						className="max-h-[70vh] w-auto max-w-full object-contain mx-auto transition duration-150 animate-in fade-in"
						onError={(e) => {
							if (!e.currentTarget.dataset.triedFallback) {
								e.currentTarget.dataset.triedFallback = "true";
								e.currentTarget.src = current.url.startsWith("/")
									? current.url
									: `/${current.url}`;
							}
						}}
					/>

					{total > 1 && (
						<>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handlePrev();
								}}
								className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-white hover:text-black text-white p-2.5 transition cursor-pointer shadow-lg z-20 hidden sm:flex items-center justify-center"
								title="Previous photo (Left Arrow)"
							>
								◀
							</button>

							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleNext();
								}}
								className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 hover:bg-white hover:text-black text-white p-2.5 transition cursor-pointer shadow-lg z-20 hidden sm:flex items-center justify-center"
								title="Next photo (Right Arrow)"
							>
								▶
							</button>
						</>
					)}
				</div>

				<div className="p-3 bg-black/90 border-t border-white/10 text-white flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
					<div className="text-center sm:text-left">
						<span className="font-mono text-emerald-400 font-bold text-sm block">
							{current.price
								? `${Number(current.price).toFixed(2)} ETB`
								: current.availability}
						</span>
						<p className="text-[10px] text-slate-400 font-mono">
							Captured {new Date(current.capturedAt).toLocaleString()}
						</p>
					</div>

					{total > 1 && (
						<div className="flex items-center gap-2 sm:hidden w-full justify-between pt-1">
							<button
								type="button"
								onClick={handlePrev}
								className="flex-1 rounded-lg bg-white/15 py-1.5 font-bold text-white text-xs"
							>
								◀ Prev
							</button>
							<button
								type="button"
								onClick={handleNext}
								className="flex-1 rounded-lg bg-white/15 py-1.5 font-bold text-white text-xs"
							>
								Next ▶
							</button>
						</div>
					)}

					<div className="hidden sm:block text-[10px] text-slate-400 font-mono">
						Swipe or use ← / → arrow keys
					</div>
				</div>
			</div>
		</div>
	);
};
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import {
	useAssignments,
	useDeleteAssignment,
	useArchiveStoreDispatch,
} from "../hooks/useAssignments.js";
import { StatusBadge } from "@/components/StatusBadge.jsx";
import { Can } from "@/components/Can.jsx";
import { SurveyAssignmentModal } from "../components/SurveyAssignmentModal.jsx";
import { PeriodManagementModal } from "../components/PeriodManagementModal.jsx";
import { ConfirmDeleteAssignmentModal } from "../components/ConfirmDeleteAssignmentModal.jsx";
import { apiClient } from "@/services/client.js";
import toast from "react-hot-toast";

const STATUS_FILTERS = [
	{ value: "", label: "Active Dispatches" },
	{ value: "NOT_STARTED", label: "Not started" },
	{ value: "IN_PROGRESS", label: "In progress" },
	{ value: "COMPLETED", label: "Completed" },
	{ value: "ARCHIVED", label: "Archived" },
];

const PAGE_SIZE = 50;

// Resolve backend asset URL pointing authoritatively to the backend host
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

const formatAssignedDate = (dateString) => {
	if (!dateString) return "—";
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

export const SurveyProgress = () => {
	const navigate = useNavigate();
	const {isAdmin,isAuditor } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();

	const page = Math.max(1, Number(searchParams.get("page") || 1));
	const statusFromUrl = searchParams.get("status") || "";

	const setPage = (next) => {
		const nextParams = new URLSearchParams(searchParams);
		if (next <= 1) nextParams.delete("page");
		else nextParams.set("page", String(next));
		setSearchParams(nextParams, { replace: true });
	};

	const setStatusFilter = (value) => {
		const nextParams = new URLSearchParams(searchParams);
		if (!value) nextParams.delete("status");
		else nextParams.set("status", value);
		nextParams.delete("page");
		setSearchParams(nextParams, { replace: true });
	};

	const { data, isLoading, isError, refetch } = useAssignments({
		page,
		limit: PAGE_SIZE,
		status: statusFromUrl || undefined,
	});

	const assignments = data?.assignments || [];

	const deleteAssignment = useDeleteAssignment();
	const archiveDispatch = useArchiveStoreDispatch();

	const [viewMode, setViewMode] = useState("STORE_DISPATCH");
	const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
	const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
	const [selectedStoreId, setSelectedStoreId] = useState(null);
	const [editingAssignment, setEditingAssignment] = useState(null);
	const [deleteCandidate, setDeleteCandidate] = useState(null);
	const [searchTerm, setSearchTerm] = useState("");

	// Proof Gallery Grid & Fullscreen Carousel Lightbox State
	const [activeProofGallery, setActiveProofGallery] = useState(null);
	const [carouselPhotos, setCarouselPhotos] = useState(null);
	const [carouselIndex, setCarouselIndex] = useState(0);

	const statusFilter = statusFromUrl;

	// Group assignments by Store + SurveyPeriod and extract ALL attached evidence photos
	const storeDispatches = useMemo(() => {
		const groups = new Map();

		for (const asn of assignments) {
			const storeId = asn.store?.id || asn.storeId || "unknown";
			const cycleId = asn.surveyPeriod?.id || asn.surveyPeriodId || "unknown";
			const groupKey = `${storeId}_${cycleId}`;

			if (!groups.has(groupKey)) {
				groups.set(groupKey, {
					id: groupKey,
					storeId,
					surveyPeriodId: cycleId,
					store: asn.store,
					surveyPeriod: asn.surveyPeriod,
					assignments: [],
					allProductIdsSet: new Set(),
					totalObservationsCount: 0,
					evidencePhotos: [],
					assignedAt: asn.assignedAt,
				});
			}

			const group = groups.get(groupKey);
			group.assignments.push(asn);

			if (Array.isArray(asn.items)) {
				asn.items.forEach((it) => {
					const pId = it.productId || it.id;
					if (pId) group.allProductIdsSet.add(pId);
				});
			}

			let asnObsCount = Number(asn.observedCount ?? asn.observationsCount ?? 0);

			if (Array.isArray(asn.audits)) {
				asn.audits.forEach((aud) => {
					// Fallback observation counter
					if (!asnObsCount) {
						asnObsCount +=
							aud._count?.observations ||
							aud.observationsCount ||
							(Array.isArray(aud.observations) ? aud.observations.length : 0);
					}

					// Always extract observation proof photos into the dispatch gallery
					if (Array.isArray(aud.observations)) {
						aud.observations.forEach((obs) => {
							if (obs.evidencePhotoUrl) {
								const urls = String(obs.evidencePhotoUrl)
									.split(",")
									.map((u) => u.trim())
									.filter(Boolean);

								urls.forEach((u, uIdx) => {
									group.evidencePhotos.push({
										id: `${obs.id}_${uIdx}`,
										url: u,
										productName: obs.product?.name || "Observed Product",
										price: obs.price ? Number(obs.price) : null,
										availability: obs.availability || "AVAILABLE",
										capturedAt: obs.capturedAt,
										auditorName: asn.auditor?.name || "Field Auditor",
										storeName: asn.store?.name || "Store",
									});
								});
							}
						});
					}
				});
			} else if (!asnObsCount && asn._count?.observations) {
				asnObsCount += asn._count.observations;
			}

			group.totalObservationsCount += asnObsCount;
		}

		return Array.from(groups.values()).map((g) => {
			const fallbackTotal = g.assignments.reduce(
				(sum, a) => sum + (a.totalItemsCount || 0),
				0,
			);
			const totalProducts =
				g.allProductIdsSet.size > 0
					? g.allProductIdsSet.size
					: fallbackTotal > 0
						? fallbackTotal
						: 120;

			const observed = Math.min(totalProducts, g.totalObservationsCount);
			const percentDone =
				totalProducts > 0 ? Math.round((observed / totalProducts) * 100) : 0;

			const isArchived =
				g.assignments.length > 0 &&
				g.assignments.every((a) => a.status === "ARCHIVED");

			const allCompleted =
				g.assignments.length > 0 &&
				g.assignments.every((a) => a.status === "COMPLETED");

			const anyInProgress = g.assignments.some(
				(a) => a.status === "IN_PROGRESS" || (a.observedCount || 0) > 0,
			);

			const overallStatus = isArchived
				? "ARCHIVED"
				: allCompleted
					? "COMPLETED"
					: anyInProgress || observed > 0
						? "IN_PROGRESS"
						: "NOT_STARTED";

			return {
				...g,
				totalProducts,
				observedCount: observed,
				percentDone,
				overallStatus,
				isArchived,
			};
		});
	}, [assignments]);

	// Filter dispatches by Active vs. Status vs. Search term
	const filteredStoreDispatches = useMemo(() => {
		let list = storeDispatches;

		if (statusFilter === "") {
			// Active Dispatches: show all non-archived dispatches
			list = list.filter((d) => !d.isArchived);
		} else if (statusFilter === "ARCHIVED") {
			// Archived: show only archived dispatches
			list = list.filter((d) => d.isArchived || d.overallStatus === "ARCHIVED");
		} else if (statusFilter) {
			list = list.filter(
				(d) => d.overallStatus === statusFilter && !d.isArchived,
			);
		}

		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			list = list.filter((d) => {
				const storeName = (d.store?.name || "").toLowerCase();
				const area = (d.store?.area || d.store?.address || "").toLowerCase();
				const auditors = d.assignments
					.map((a) => a.auditor?.name || "")
					.join(" ")
					.toLowerCase();
				return (
					storeName.includes(term) ||
					area.includes(term) ||
					auditors.includes(term)
				);
			});
		}

		return list;
	}, [storeDispatches, statusFilter, searchTerm]);

	const counts = useMemo(
		() => ({
			all: storeDispatches.filter((d) => !d.isArchived).length,
			notStarted: storeDispatches.filter(
				(d) => d.overallStatus === "NOT_STARTED" && !d.isArchived,
			).length,
			inProgress: storeDispatches.filter(
				(d) => d.overallStatus === "IN_PROGRESS" && !d.isArchived,
			).length,
			completed: storeDispatches.filter(
				(d) => d.overallStatus === "COMPLETED" && !d.isArchived,
			).length,
		}),
		[storeDispatches],
	);

	const handleConfirmDelete = async () => {
		if (!deleteCandidate) return;
		try {
			await deleteAssignment.mutateAsync(deleteCandidate.id);
			setDeleteCandidate(null);
		} catch (err) {
			toast.error(
				err?.response?.data?.message || "Failed to delete assignment",
			);
		}
	};

	const handleArchiveDispatch = async (dispatch) => {
		try {
			await archiveDispatch.mutateAsync({
				storeId: dispatch.storeId,
				surveyPeriodId: dispatch.surveyPeriodId,
				archive: !dispatch.isArchived,
			});
			refetch();
		} catch {
			// Handled by toast
		}
	};

	const handleOpenDispatchModal = (storeId = null) => {
		setSelectedStoreId(storeId);
		setEditingAssignment(null);
		setIsAssignmentModalOpen(true);
	};

	// Open Carousel Lightbox at specific photo index
	const handleOpenCarousel = (photos, startIndex = 0) => {
		setCarouselPhotos(photos);
		setCarouselIndex(startIndex);
	};

	return (
		<div className="mx-auto max-w-6xl space-y-6 pb-12">
			{/* Header Banner */}
			<div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-xl font-black tracking-tight text-slate-900">
						Field Survey Dispatches
					</h1>
					<p className="mt-0.5 text-xs text-slate-500">
						{isAuditor
							? "Your assigned store audits and target product checklists"
							: "Monitor store dispatch completion, view proof galleries, and allocate tasks"}
					</p>
				</div>

				<Can role={["ADMIN", "MANAGER", "SUPER_ADMIN"]}>
					{isAdmin && (
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => setIsPeriodModalOpen(true)}
								className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 active:scale-95"
							>
								Manage Cycles
							</button>
							<button
								type="button"
								onClick={() => handleOpenDispatchModal(null)}
								className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#7F1219] active:scale-95"
							>
								+ Dispatch Store Survey
							</button>
						</div>
					)}
				</Can>
			</div>

			{/* KPI Summary */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Kpi label="Active Dispatches" value={counts.all} tone="slate" />
				<Kpi label="Not Started" value={counts.notStarted} tone="amber" />
				<Kpi label="In Progress" value={counts.inProgress} tone="blue" />
				<Kpi label="Completed" value={counts.completed} tone="emerald" />
			</div>

			{/* Search, Status Filters & View Toggle */}
			<div className="space-y-3">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div className="relative flex-1">
						<input
							type="text"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Search store name, area, or assigned auditor..."
							className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
						/>
						<svg
							className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>

					{!isAuditor && (
						<div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold flex-none">
							<button
								type="button"
								onClick={() => setViewMode("STORE_DISPATCH")}
								className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
									viewMode === "STORE_DISPATCH"
										? "bg-white text-slate-900 shadow-2xs"
										: "text-slate-500 hover:text-slate-800"
								}`}
							>
								Store Dispatches ({filteredStoreDispatches.length})
							</button>
							<button
								type="button"
								onClick={() => setViewMode("INDIVIDUAL_TASKS")}
								className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
									viewMode === "INDIVIDUAL_TASKS"
										? "bg-white text-slate-900 shadow-2xs"
										: "text-slate-500 hover:text-slate-800"
								}`}
							>
								Auditor Tasks ({assignments.length})
							</button>
						</div>
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					{STATUS_FILTERS.map((f) => (
						<button
							key={f.value || "all"}
							type="button"
							onClick={() => setStatusFilter(f.value)}
							className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
								statusFilter === f.value
									? "bg-[#A41821] text-white"
									: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
							}`}
						>
							{f.label}
						</button>
					))}
				</div>
			</div>

			{/* Loading */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
				</div>
			)}

			{/* Content */}
			{!isLoading && !isError && (
				<>
					{viewMode === "STORE_DISPATCH" && !isAuditor ? (
						filteredStoreDispatches.length === 0 ? (
							<EmptyState
								statusFilter={statusFilter}
								searchTerm={searchTerm}
								onNew={() => handleOpenDispatchModal(null)}
							/>
						) : (
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{filteredStoreDispatches.map((dispatch) => (
									<StoreDispatchCard
										key={dispatch.id}
										dispatch={dispatch}
										isAdmin={isAdmin}
										onManage={() => handleOpenDispatchModal(dispatch.storeId)}
										onArchive={() => handleArchiveDispatch(dispatch)}
										isArchiving={archiveDispatch.isPending}
										onViewAudits={() =>
											navigate(`/audits?storeId=${dispatch.storeId}`)
										}
										onOpenProofGallery={() => setActiveProofGallery(dispatch)}
									/>
								))}
							</div>
						)
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{assignments.map((assignment) => (
								<AssignmentCard
									key={assignment.id}
									assignment={assignment}
									isAuditor={isAuditor}
									onViewAudits={() =>
										navigate(`/audits?assignmentId=${assignment.id}`)
									}
									onEdit={() => {
										setEditingAssignment(assignment);
										setIsAssignmentModalOpen(true);
									}}
									onDelete={() => setDeleteCandidate(assignment)}
									onOpenProof={(photos) => handleOpenCarousel(photos, 0)}
								/>
							))}
						</div>
					)}
				</>
			)}

			{/* Modals */}
			<SurveyAssignmentModal
				isOpen={isAssignmentModalOpen}
				onClose={() => {
					setIsAssignmentModalOpen(false);
					setSelectedStoreId(null);
					setEditingAssignment(null);
					refetch();
				}}
				storeId={selectedStoreId}
				assignment={editingAssignment}
			/>

			<PeriodManagementModal
				isOpen={isPeriodModalOpen}
				onClose={() => setIsPeriodModalOpen(false)}
			/>

			<ConfirmDeleteAssignmentModal
				isOpen={Boolean(deleteCandidate)}
				onClose={() => setDeleteCandidate(null)}
				onConfirm={handleConfirmDelete}
				isPending={deleteAssignment.isPending}
				assignment={deleteCandidate}
			/>

			{/* Dispatch Proof Image View Gallery Modal (Grid View) */}
			{activeProofGallery && (
				<ProofGalleryModal
					dispatch={activeProofGallery}
					onClose={() => setActiveProofGallery(null)}
					onSelectProofIndex={(idx) => {
						const photos = activeProofGallery.evidencePhotos || [];
						setActiveProofGallery(null); // Switch from grid to fullscreen carousel
						handleOpenCarousel(photos, idx);
					}}
				/>
			)}

			{/* Fullscreen Carousel Lightbox Modal (Swipe + Arrow Keys + Touch Supported) */}
			{carouselPhotos && carouselPhotos.length > 0 && (
				<LightboxModal
					photos={carouselPhotos}
					currentIndex={carouselIndex}
					onIndexChange={setCarouselIndex}
					onClose={() => setCarouselPhotos(null)}
					resolveUrl={resolveAssetUrl}
				/>
			)}
		</div>
	);
};

/* Overall Store Dispatch Card with Proof Gallery Preview */
const StoreDispatchCard = ({
	dispatch,
	onManage,
	onArchive,
	isArchiving,
	onViewAudits,
	onOpenProofGallery,
}) => {
	const store = dispatch.store || {};
	const cycle = dispatch.surveyPeriod || {};
	const isDone = dispatch.overallStatus === "COMPLETED";
	const isArchived = dispatch.isArchived;
	const photos = dispatch.evidencePhotos || [];

	const statusAccent =
		{
			NOT_STARTED: "bg-slate-300",
			IN_PROGRESS: "bg-[#FE7914]",
			COMPLETED: "bg-[#017C4D]",
			CANCELLED: "bg-slate-400",
			ARCHIVED: "bg-slate-500",
		}[dispatch.overallStatus] || "bg-slate-300";

	return (
		<div
			className={`flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xs transition hover:shadow-sm ${
				isArchived
					? "border-slate-300 opacity-75"
					: "border-slate-200 hover:border-slate-300"
			}`}
		>
			<div className={`h-1.5 w-full ${statusAccent}`} />

			<div className="flex flex-1 flex-col p-4 space-y-3.5">
				{/* Header */}
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<h3 className="truncate text-base font-black text-slate-900">
							{store.name || "Unknown Store"}
						</h3>
						<p className="mt-0.5 truncate text-[11px] text-slate-500 font-medium">
							{store.area || store.address || "Addis Ababa"} • Cycle{" "}
							{cycle.name || cycle.id || ""}
						</p>
					</div>
					<StatusBadge status={dispatch.overallStatus} />
				</div>

				{/* Progress Bar */}
				<div className="space-y-1.5 rounded-xl bg-slate-50/80 p-3 border border-slate-100">
					<div className="flex items-center justify-between text-xs font-bold text-slate-700">
						<span>Overall Progress:</span>
						<span className="font-mono text-slate-900">
							{dispatch.observedCount} / {dispatch.totalProducts} items
						</span>
					</div>

					<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
						<div
							className={`h-full rounded-full transition-all duration-300 ${
								isDone
									? "bg-[#017C4D]"
									: dispatch.observedCount > 0
										? "bg-[#FE7914]"
										: "bg-slate-300"
							}`}
							style={{ width: `${dispatch.percentDone}%` }}
						/>
					</div>

					<div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 font-mono">
						<span>{dispatch.percentDone}% Completed</span>
						<span>
							{dispatch.totalProducts - dispatch.observedCount} Remaining
						</span>
					</div>
				</div>

				{/* Team on Duty & Proof Count */}
				<div className="flex items-center justify-between gap-2">
					<div>
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
							Team ({dispatch.assignments.length})
						</span>
						<div className="flex flex-wrap gap-1">
							{dispatch.assignments.map((asn) => (
								<span
									key={asn.id}
									className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-2xs"
								>
									<span className="h-1.5 w-1.5 rounded-full bg-[#017C4D]" />
									{asn.auditor?.name?.split(" ")[0]} ({asn.items?.length || 0})
								</span>
							))}
						</div>
					</div>

					{/* Proof Gallery Button */}
					{photos.length > 0 && (
						<button
							type="button"
							onClick={onOpenProofGallery}
							className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-2.5 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
							title="View uploaded receipts and evidence photos"
						>
							<span>📷</span>
							<span>Proof ({photos.length})</span>
						</button>
					)}
				</div>

				{/* Card Footer */}
				<div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold gap-2">
					<button
						type="button"
						onClick={onViewAudits}
						className="text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
					>
						Visits →
					</button>

					<div className="flex items-center gap-2">
						{photos.length > 0 && (
							<button
								type="button"
								onClick={onOpenProofGallery}
								className="text-blue-700 hover:underline font-bold text-xs cursor-pointer"
							>
								Photos ({photos.length})
							</button>
						)}

						{/* Management buttons hidden for Queens Admin */}
						{isAdmin && (
							<>
								<button
									type="button"
									onClick={onManage}
									className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
								>
									Manage
								</button>

								<button
									type="button"
									disabled={isArchiving}
									onClick={onArchive}
									className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer disabled:opacity-50"
								>
									{isArchived ? "Unarchive" : "Archive"}
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

/* Proof Gallery Modal for a Dispatch (Grid view of all photos) */
const ProofGalleryModal = ({ dispatch, onClose, onSelectProofIndex }) => {
	const photos = dispatch.evidencePhotos || [];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
			<div className="w-full max-w-3xl rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl flex flex-col max-h-[85vh]">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-none">
					<div>
						<h2 className="text-base font-black text-slate-900">
							Dispatch Proof Gallery ({photos.length})
						</h2>
						<p className="text-xs text-slate-500 font-medium">
							{dispatch.store?.name} • Receipts, shelf items, and substitute
							proofs
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
					>
						✕
					</button>
				</div>

				{/* Photos Grid */}
				<div className="flex-1 overflow-y-auto py-3">
					{photos.length === 0 ? (
						<div className="py-12 text-center text-xs text-slate-400">
							No proof photos captured yet for this store dispatch.
						</div>
					) : (
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
							{photos.map((proof, idx) => (
								<div
									key={proof.id}
									onClick={() => onSelectProofIndex(idx)}
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
												? `${Number(proof.price).toFixed(2)} ETB`
												: proof.availability}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-slate-100 pt-3 flex justify-end flex-none">
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
					>
						Close Gallery
					</button>
				</div>
			</div>
		</div>
	);
};

/* Fullscreen Carousel Lightbox Modal with Swipe, Keyboard, and Touch Support */
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

	// Keyboard arrow & Escape navigation
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === "ArrowRight") handleNext();
			else if (e.key === "ArrowLeft") handlePrev();
			else if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleNext, handlePrev, onClose]);

	// Prevent background scroll while lightbox is open
	useEffect(() => {
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = "unset";
		};
	}, []);

	// Touch swipe gestures
	const onTouchStart = (e) => {
		setTouchStartX(e.touches[0].clientX);
	};

	const onTouchEnd = (e) => {
		if (touchStartX === null) return;
		const touchEndX = e.changedTouches[0].clientX;
		const deltaX = touchStartX - touchEndX;

		if (deltaX > 50) {
			handleNext(); // Swiped left -> Next photo
		} else if (deltaX < -50) {
			handlePrev(); // Swiped right -> Previous photo
		}
		setTouchStartX(null);
	};

	if (!current) return null;

	return (
		<div
			className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-2 sm:p-4 select-none animate-in fade-in duration-150"
			onClick={onClose}
		>
			<div
				className="relative max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-2xl flex flex-col"
				onClick={(e) => e.stopPropagation()}
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
			>
				{/* Top Floating Header */}
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

				{/* Center Main Image Canvas */}
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

					{/* Desktop Left/Right Navigation Chevrons */}
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

				{/* Bottom Metadata & Mobile Navigation Bar */}
				<div className="p-3 bg-black/90 border-t border-white/10 text-white flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
					<div className="text-center sm:text-left">
						<span className="font-mono text-emerald-400 font-bold text-sm block">
							{current.price
								? `${Number(current.price).toFixed(2)} ETB`
								: current.availability}
						</span>
						<p className="text-[10px] text-slate-400 font-mono">
							Auditor: {current.auditorName || "Field Auditor"} • Captured{" "}
							{current.capturedAt
								? new Date(current.capturedAt).toLocaleString()
								: "Recently"}
						</p>
					</div>

					{/* Mobile Step Buttons */}
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

const AssignmentCard = ({
	assignment,
	isAuditor,
	onViewAudits,
	onEdit,
	onDelete,
	onOpenProof,
}) => {
	const store = assignment.store || {};
	const auditor = assignment.auditor || {};
	const cycle = assignment.surveyPeriod || {};

	const canEdit = assignment.status === "NOT_STARTED";
	const canDelete =
		assignment.status === "NOT_STARTED" && (assignment.auditsCount ?? 0) <= 1;

	const productCount =
		assignment.totalItemsCount ?? assignment.items?.length ?? 0;

	// Extract photos from assignment audits
	const assignmentPhotos = useMemo(() => {
		const photos = [];
		if (Array.isArray(assignment.audits)) {
			assignment.audits.forEach((aud) => {
				if (Array.isArray(aud.observations)) {
					aud.observations.forEach((obs) => {
						if (obs.evidencePhotoUrl) {
							const urls = String(obs.evidencePhotoUrl)
								.split(",")
								.map((u) => u.trim())
								.filter(Boolean);
							urls.forEach((u, uIdx) => {
								photos.push({
									id: `${obs.id}_${uIdx}`,
									url: u,
									productName: obs.product?.name || "Product",
									price: obs.price ? Number(obs.price) : null,
									availability: obs.availability || "AVAILABLE",
									capturedAt: obs.capturedAt,
									auditorName: assignment.auditor?.name || "Field Auditor",
									storeName: assignment.store?.name || "Store",
								});
							});
						}
					});
				}
			});
		}
		return photos;
	}, [assignment]);

	const statusAccent =
		{
			NOT_STARTED: "bg-slate-300",
			IN_PROGRESS: "bg-[#FE7914]",
			COMPLETED: "bg-[#017C4D]",
			CANCELLED: "bg-slate-400",
			ARCHIVED: "bg-slate-500",
		}[assignment.status] || "bg-slate-300";

	return (
		<div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-sm">
			<div className={`h-1 w-full ${statusAccent}`} />

			<div className="flex flex-1 flex-col p-4">
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<h3 className="truncate text-sm font-bold text-slate-900">
							{store.name || "Unknown store"}
						</h3>
						<p className="mt-0.5 truncate text-[11px] text-slate-500">
							{store.area || store.address || store.city || "No location"}
						</p>
					</div>
					<StatusBadge status={assignment.status} />
				</div>

				<div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50/70 px-2.5 py-2">
					<DetailCell
						label="Auditor"
						value={auditor.name || "—"}
						sub={auditor.phone || ""}
					/>
					<DetailCell
						label="Cycle"
						value={cycle.name || "—"}
						sub={cycle.status || ""}
						mono
					/>
				</div>

				<div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
					<span className="inline-flex items-center gap-1">
						<span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
							{productCount}
						</span>
						products
					</span>

					{assignmentPhotos.length > 0 && (
						<button
							type="button"
							onClick={() => onOpenProof(assignmentPhotos)}
							className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
						>
							<span>📷</span>
							<span>Proof ({assignmentPhotos.length})</span>
						</button>
					)}

					{assignment.assignedAt && (
						<span className="text-slate-400">
							Assigned {formatAssignedDate(assignment.assignedAt)}
						</span>
					)}
				</div>

				<div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
					<button
						type="button"
						onClick={onViewAudits}
						className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline"
					>
						View Audits →
					</button>

					{!isAuditor && (
						<div className="flex items-center gap-3 text-xs font-semibold">
							<button
								type="button"
								disabled={!canEdit}
								onClick={onEdit}
								className="cursor-pointer text-[#A41821] hover:underline disabled:cursor-not-allowed disabled:opacity-40"
							>
								Edit
							</button>
							<button
								type="button"
								disabled={!canDelete}
								onClick={onDelete}
								className="cursor-pointer text-red-600 hover:text-red-800 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
							>
								Delete
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

const EmptyState = ({ statusFilter, searchTerm, onNew }) => (
	<div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
		<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
			<svg
				className="h-7 w-7"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
				/>
			</svg>
		</div>
		<h3 className="mt-4 text-sm font-bold text-slate-800">
			{statusFilter || searchTerm
				? "No dispatches match your filters"
				: "No active store dispatches"}
		</h3>
		<p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
			{statusFilter || searchTerm
				? "Try adjusting your search query or filters."
				: "Dispatch a new survey assignment to begin tracking store progress."}
		</p>
		<div className="mt-4">
			<button
				type="button"
				onClick={onNew}
				className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
			>
				+ Dispatch Store Survey
			</button>
		</div>
	</div>
);

const DetailCell = ({ label, value, sub, mono = false }) => (
	<div className="min-w-0">
		<p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
			{label}
		</p>
		<p
			className={`mt-0.5 truncate text-[11px] font-bold text-slate-700 ${mono ? "font-mono" : ""}`}
		>
			{value}
		</p>
		{sub && <p className="mt-0.5 truncate text-[10px] text-slate-400">{sub}</p>}
	</div>
);

const Kpi = ({ label, value, tone }) => {
	const tones = {
		slate: "border-slate-200 bg-white text-slate-900",
		amber: "border-amber-200 bg-amber-50/50 text-[#FE7914]",
		blue: "border-blue-200 bg-blue-50/50 text-blue-700",
		emerald: "border-emerald-200 bg-emerald-50/50 text-[#017C4D]",
	};
	return (
		<div className={`rounded-xl border px-3 py-2.5 ${tones[tone]}`}>
			<p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
				{label}
			</p>
			<p className="mt-1 text-xl font-black">{value}</p>
		</div>
	);
};
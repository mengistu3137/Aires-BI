import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import {
	useAssignments,
	useDeleteAssignment,
} from "../hooks/useAssignments.js";
import { StatusBadge } from "@/components/StatusBadge.jsx";
import { Can } from "@/components/Can.jsx";
import { SurveyAssignmentModal } from "../components/SurveyAssignmentModal.jsx";
import { PeriodManagementModal } from "../components/PeriodManagementModal.jsx";
import { ConfirmDeleteAssignmentModal } from "../components/ConfirmDeleteAssignmentModal.jsx";
import toast from "react-hot-toast";

const STATUS_FILTERS = [
	{ value: "", label: "All" },
	{ value: "NOT_STARTED", label: "Not started" },
	{ value: "IN_PROGRESS", label: "In progress" },
	{ value: "COMPLETED", label: "Completed" },
	{ value: "CANCELLED", label: "Cancelled" },
];

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
	const { isAuditor } = useAuth();
	const {
		data: assignments = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useAssignments();
	const deleteAssignment = useDeleteAssignment();
  console.log("the assignment",assignments)

	const [viewMode, setViewMode] = useState("STORE_DISPATCH"); // 'STORE_DISPATCH' | 'INDIVIDUAL_TASKS'
	const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
	const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
	const [selectedStoreId, setSelectedStoreId] = useState(null);
	const [editingAssignment, setEditingAssignment] = useState(null);
	const [deleteCandidate, setDeleteCandidate] = useState(null);
	const [statusFilter, setStatusFilter] = useState("");
	const [searchTerm, setSearchTerm] = useState("");

// Group assignments by Store + SurveyPeriod for Overall Store Dispatch Tracking
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
					store: asn.store,
					surveyPeriod: asn.surveyPeriod,
					assignments: [],
					allProductIdsSet: new Set(),
					totalObservationsCount: 0,
					assignedAt: asn.assignedAt,
				});
			}

			const group = groups.get(groupKey);
			group.assignments.push(asn);

			// Collect all assigned product IDs for this store
			if (Array.isArray(asn.items)) {
				asn.items.forEach((it) => {
					const pId = it.productId || it.id;
					if (pId) group.allProductIdsSet.add(pId);
				});
			}

			// Authoritative count from backend helper (asn.observedCount)
			let asnObsCount = Number(asn.observedCount ?? asn.observationsCount ?? 0);

			// Fallback if raw relational audits array is provided
			if (!asnObsCount && Array.isArray(asn.audits)) {
				asn.audits.forEach((aud) => {
					asnObsCount +=
						aud._count?.observations ||
						aud.observationsCount ||
						(Array.isArray(aud.observations) ? aud.observations.length : 0);
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

			const allCompleted =
				g.assignments.length > 0 &&
				g.assignments.every((a) => a.status === "COMPLETED");
			const anyInProgress = g.assignments.some(
				(a) => a.status === "IN_PROGRESS" || (a.observedCount || 0) > 0,
			);
			const overallStatus = allCompleted
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
			};
		});
	}, [assignments]);
	// Filtering for Store Dispatches
	const filteredStoreDispatches = useMemo(() => {
		let list = storeDispatches;

		if (statusFilter) {
			list = list.filter((d) => d.overallStatus === statusFilter);
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

	// Filtering for Individual Assignments
	const visibleAssignments = useMemo(() => {
		let list = assignments;

		if (statusFilter) {
			list = list.filter((a) => a.status === statusFilter);
		}

		if (searchTerm.trim()) {
			const term = searchTerm.toLowerCase();
			list = list.filter((a) => {
				const storeName = (a.store?.name || "").toLowerCase();
				const area = (a.store?.area || a.store?.address || "").toLowerCase();
				const auditorName = (a.auditor?.name || "").toLowerCase();
				const cycleId = (a.surveyPeriod?.id || "").toLowerCase();
				return (
					storeName.includes(term) ||
					area.includes(term) ||
					auditorName.includes(term) ||
					cycleId.includes(term)
				);
			});
		}

		return list;
	}, [assignments, statusFilter, searchTerm]);

	const counts = useMemo(
		() => ({
			all: storeDispatches.length,
			notStarted: storeDispatches.filter(
				(d) => d.overallStatus === "NOT_STARTED",
			).length,
			inProgress: storeDispatches.filter(
				(d) => d.overallStatus === "IN_PROGRESS",
			).length,
			completed: storeDispatches.filter((d) => d.overallStatus === "COMPLETED")
				.length,
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

	const handleOpenDispatchModal = (storeId = null) => {
		setSelectedStoreId(storeId);
		setEditingAssignment(null);
		setIsAssignmentModalOpen(true);
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
							: "Monitor store dispatch completion and allocate tasks across multiple field auditors"}
					</p>
				</div>

				<Can role={["ADMIN", "MANAGER"]}>
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
				</Can>
			</div>

			{/* KPI Summary (Reflects Total Store Dispatches) */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Kpi label="Store Dispatches" value={counts.all} tone="slate" />
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

					{/* View Mode Toggle (Management only) */}
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
								Store Dispatches (Overall)
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

				{/* Status Filters */}
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

			{/* Error */}
			{isError && (
				<div className="rounded-2xl border border-red-200 bg-red-50 p-4">
					<p className="text-xs font-medium text-[#A41821]">
						{error?.message || "Unable to load assignments"}
					</p>
					<button
						type="button"
						onClick={() => refetch()}
						className="mt-2 cursor-pointer rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#A41821] hover:bg-red-50"
					>
						Try again
					</button>
				</div>
			)}

			{/* Cards Content */}
			{!isLoading && !isError && (
				<>
					{viewMode === "STORE_DISPATCH" && !isAuditor ? (
						/* A. OVERALL STORE DISPATCH CARDS (Aggregated Multi-Auditor Progress) */
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
										onManage={() => handleOpenDispatchModal(dispatch.storeId)}
										onViewAudits={() =>
											navigate(`/audits?storeId=${dispatch.storeId}`)
										}
									/>
								))}
							</div>
						)
					) : /* B. INDIVIDUAL AUDITOR ASSIGNMENTS */
					visibleAssignments.length === 0 ? (
						<EmptyState
							statusFilter={statusFilter}
							searchTerm={searchTerm}
							onNew={() => handleOpenDispatchModal(null)}
						/>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{visibleAssignments.map((assignment) => (
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
								/>
							))}
						</div>
					)}
				</>
			)}

			{/* Dispatch Modal */}
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

			{/* Period management modal */}
			<PeriodManagementModal
				isOpen={isPeriodModalOpen}
				onClose={() => setIsPeriodModalOpen(false)}
			/>

			{/* Confirm delete */}
			<ConfirmDeleteAssignmentModal
				isOpen={Boolean(deleteCandidate)}
				onClose={() => setDeleteCandidate(null)}
				onConfirm={handleConfirmDelete}
				isPending={deleteAssignment.isPending}
				assignment={deleteCandidate}
			/>
		</div>
	);
};

/* Overall Store Dispatch Card Component */
const StoreDispatchCard = ({ dispatch, onManage, onViewAudits }) => {
	const store = dispatch.store || {};
	const cycle = dispatch.surveyPeriod || {};
	const isDone = dispatch.overallStatus === "COMPLETED";

	const statusAccent =
		{
			NOT_STARTED: "bg-slate-300",
			IN_PROGRESS: "bg-[#FE7914]",
			COMPLETED: "bg-[#017C4D]",
			CANCELLED: "bg-slate-400",
		}[dispatch.overallStatus] || "bg-slate-300";

	return (
		<div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-slate-300 hover:shadow-sm">
			<div className={`h-1.5 w-full ${statusAccent}`} />

			<div className="flex flex-1 flex-col p-4 space-y-3.5">
				{/* Header: Store Name + Overall Status */}
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<h3 className="truncate text-base font-black text-slate-900">
							{store.name || "Unknown Store"}
						</h3>
						<p className="mt-0.5 truncate text-[11px] text-slate-500 font-medium">
							{store.area || store.address || "Addis Ababa"} • {store.type}
						</p>
					</div>
					<StatusBadge status={dispatch.overallStatus} />
				</div>

				{/* OVERALL DISPATCH PROGRESS BAR (Tracked against 100 or 120 items) */}
				<div className="space-y-1.5 rounded-xl bg-slate-50/80 p-3 border border-slate-100">
					<div className="flex items-center justify-between text-xs font-bold text-slate-700">
						<span>Overall Dispatch Progress:</span>
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

				{/* Team on Duty (Assigned Auditors) */}
				<div>
					<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
						Team on Duty ({dispatch.assignments.length} Auditors)
					</span>
					<div className="flex flex-wrap gap-1.5">
						{dispatch.assignments.map((asn) => (
							<span
								key={asn.id}
								className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs"
							>
								<span className="h-1.5 w-1.5 rounded-full bg-[#017C4D]" />
								{asn.auditor?.name} ({asn.items?.length || 0})
							</span>
						))}
					</div>
				</div>

				{/* Card Footer Actions */}
				<div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold">
					<button
						type="button"
						onClick={onViewAudits}
						className="text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
					>
						View Visits →
					</button>

					<button
						type="button"
						onClick={onManage}
						className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
					>
						Manage Dispatch
					</button>
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
}) => {
	const store = assignment.store || {};
	const auditor = assignment.auditor || {};
	const cycle = assignment.surveyPeriod || {};

	const canEdit = assignment.status === "NOT_STARTED";
	const canDelete =
		assignment.status === "NOT_STARTED" && (assignment.auditsCount ?? 0) <= 1;

	const productCount =
		assignment.totalItemsCount ?? assignment.items?.length ?? 0;

	const statusAccent =
		{
			NOT_STARTED: "bg-slate-300",
			IN_PROGRESS: "bg-[#FE7914]",
			COMPLETED: "bg-[#017C4D]",
			CANCELLED: "bg-slate-400",
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
						View audits →
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
				: "No store dispatches yet"}
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
				className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white shadow-xs"
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
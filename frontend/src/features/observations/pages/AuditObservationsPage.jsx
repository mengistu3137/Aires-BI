import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAudit } from "@/features/audits/hooks/useAudit.js";
import { useAuditObservations } from "../hooks/useAuditObservations.js";
import { useUpdateObservation } from "../hooks/useObservationMutations.js";
import { useLocalQueue } from "../hooks/useLocalQueue.js";
import { useAuth } from "@/hooks/useAuth.js";
import { FastProductSearch } from "../components/FastProductSearch.jsx";
import { RapidPriceInput } from "../components/RapidPriceInput.jsx";
import { ObservationProgress } from "../components/ObservationProgress.jsx";
import { ObservationEmptyState } from "../components/ObservationEmptyState.jsx";
import { ObservationAvailabilityBadge } from "../components/ObservationAvailabilityBadge.jsx";
import { ObservationReviewBadge } from "../components/ObservationReviewBadge.jsx";
import { ObservationSyncBadge } from "../components/ObservationSyncBadge.jsx";
import { formatPrice, formatCapturedAt } from "../utils/observation.utils.js";
import {
	enqueueObservation,
	syncObservation,
	flushQueue,
} from "../offline/observationQueue.js";
import { formatProductName } from "@/utils/formatters.js";

/**
 * Deterministic client observation id — stable across retries.
 */
const buildClientObservationId = (auditId, productId) =>
	`obs_${auditId}_${productId}`;

export const AuditObservationsPage = () => {
	const { auditId } = useParams();
	const navigate = useNavigate();
	const { user, isManager, isAdmin } = useAuth();

	const { data: audit, isLoading: auditLoading } = useAudit(auditId);
	const { data, isLoading, isError, error } = useAuditObservations(auditId, {
		limit: 200,
	});

	const observations = data?.observations || [];
	const store = audit?.store;
	const surveyPeriod = audit?.surveyPeriod;
	const auditor = audit?.auditor;

	const isAssignedAuditor = Boolean(user?.id && audit?.auditor?.id === user.id);
	const isPrivileged = isManager || isAdmin;

	if (auditLoading || isLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center px-4">
				<div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
			</div>
		);
	}

	if (isError || !audit) {
		return (
			<div className="mx-auto max-w-md px-4 py-8">
				<div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
					<p className="text-sm font-bold text-[#A41821]">
						{error?.message || "Unable to load observations"}
					</p>
					<button
						type="button"
						onClick={() => navigate(`/audits/${auditId}`)}
						className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
					>
						Back to audit
					</button>
				</div>
			</div>
		);
	}

	if (isAssignedAuditor) {
		return (
			<CollectionView
				audit={audit}
				observations={observations}
				auditId={auditId}
			/>
		);
	}

	if (observations.length === 0) {
		return (
			<div className="mx-auto max-w-2xl space-y-4 px-4 pb-24 pt-4 sm:px-6">
				<BackButton navigate={navigate} auditId={auditId} />
				<ObservationEmptyState
					title="No observations recorded yet"
					description="The assigned auditor has not recorded any observations for this audit."
				/>
			</div>
		);
	}

	return (
		<ReadOnlyObservationsView
			audit={audit}
			observations={observations}
			store={store}
			auditor={auditor}
			surveyPeriod={surveyPeriod}
			auditId={auditId}
		/>
	);
};

// ============================================================
// READ-ONLY VIEW (Admin / Manager)
// ============================================================
const ReadOnlyObservationsView = ({
	audit,
	observations,
	store,
	auditor,
	surveyPeriod,
	auditId,
}) => {
	const navigate = useNavigate();

	const [search, setSearch] = useState("");
	const [availability, setAvailability] = useState("");
	const [reviewStatus, setReviewStatus] = useState("");
	const [syncStatus, setSyncStatus] = useState("");
	const [isFilterOpen, setIsFilterOpen] = useState(false);

	const filterPanelRef = useRef(null);
	const filterButtonRef = useRef(null);

	const observationsByProduct = useMemo(() => {
		const map = {};
		for (const o of observations) {
			const existing = map[o.productId];
			if (
				!existing ||
				new Date(o.capturedAt).getTime() >=
					new Date(existing.capturedAt).getTime()
			) {
				map[o.productId] = o;
			}
		}
		return map;
	}, [observations]);

	const observedCount = Object.keys(observationsByProduct).length;
	const totalCount = audit?.assignment?.items?.length || observedCount;

	const filteredObservations = useMemo(() => {
		let list = observations;

		if (availability) {
			list = list.filter((o) => o.availability === availability);
		}
		if (reviewStatus) {
			list = list.filter((o) => o.review?.status === reviewStatus);
		}
		if (syncStatus) {
			list = list.filter((o) => o.sync?.status === syncStatus);
		}

		if (search.trim()) {
			const term = search.toLowerCase();
			list = list.filter((o) => {
				const name = (o.product?.name || "").toLowerCase();
				const sku = (o.product?.sku || "").toLowerCase();
				const barcode = (o.product?.barcode || "").toLowerCase();
				const category = (o.product?.category || "").toLowerCase();
				const notes = (o.notes || "").toLowerCase();
				return (
					name.includes(term) ||
					sku.includes(term) ||
					barcode.includes(term) ||
					category.includes(term) ||
					notes.includes(term)
				);
			});
		}

		return list;
	}, [observations, availability, reviewStatus, syncStatus, search]);

	const activeFilterCount = [availability, reviewStatus, syncStatus].filter(
		Boolean,
	).length;
	const hasActiveFilters = Boolean(
		search.trim() || availability || reviewStatus || syncStatus,
	);

	const clearFilters = () => {
		setSearch("");
		setAvailability("");
		setReviewStatus("");
		setSyncStatus("");
	};

	useEffect(() => {
		if (!isFilterOpen) return;

		const handlePointerDown = (event) => {
			if (
				filterPanelRef.current &&
				!filterPanelRef.current.contains(event.target) &&
				filterButtonRef.current &&
				!filterButtonRef.current.contains(event.target)
			) {
				setIsFilterOpen(false);
			}
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("touchstart", handlePointerDown);

		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("touchstart", handlePointerDown);
		};
	}, [isFilterOpen]);

	useEffect(() => {
		if (!isFilterOpen) return;
		const handleKey = (e) => {
			if (e.key === "Escape") {
				setIsFilterOpen(false);
				filterButtonRef.current?.focus();
			}
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, [isFilterOpen]);

	return (
		<div className="pb-24">
			<div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
				<div className="mx-auto max-w-4xl px-3 pt-2.5 sm:px-6 sm:pt-4">
					<BackButton navigate={navigate} auditId={auditId} />

					<div className="mt-1 flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<h1 className="truncate text-base font-black text-slate-900 sm:text-lg">
								{store?.name || "Unknown store"}
							</h1>
							<p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
								{store?.competitor?.name}
								{store?.area && ` • ${store.area}`}
								{surveyPeriod?.name && ` • ${surveyPeriod.name}`}
							</p>
							{auditor && (
								<p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">
									Auditor: {auditor.name}
								</p>
							)}
						</div>
						<span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
							Read-only
						</span>
					</div>

					<div className="mt-2.5 pb-2.5 sm:mt-3 sm:pb-3.5">
						<ObservationProgress observed={observedCount} total={totalCount} />
					</div>
				</div>
			</div>

			<div className="mx-auto max-w-4xl space-y-3 px-3 pt-3 sm:space-y-4 sm:px-6 sm:pt-4">
				<div className="flex items-stretch gap-2">
					<div className="relative flex-1">
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search product, SKU, barcode…"
							className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
						/>
						<svg
							className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							aria-hidden="true"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						{search && (
							<button
								type="button"
								onClick={() => setSearch("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
								aria-label="Clear search"
							>
								✕
							</button>
						)}
					</div>

					<div className="relative shrink-0">
						<button
							ref={filterButtonRef}
							type="button"
							onClick={() => setIsFilterOpen((s) => !s)}
							className={`flex h-full items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition ${
								hasActiveFilters
									? "border-[#A41821] bg-[#A41821] text-white hover:bg-[#7F1219]"
									: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
							}`}
							aria-expanded={isFilterOpen}
							aria-haspopup="true"
							aria-controls="observation-filter-panel"
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
									d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
								/>
							</svg>
							<span className="hidden sm:inline">Filters</span>
							{activeFilterCount > 0 && (
								<span
									className={`rounded-full px-1.5 text-[10px] font-black ${
										hasActiveFilters
											? "bg-white/25 text-white"
											: "bg-slate-200 text-slate-700"
									}`}
								>
									{activeFilterCount}
								</span>
							)}
						</button>

						{isFilterOpen && (
							<div
								ref={filterPanelRef}
								id="observation-filter-panel"
								role="dialog"
								aria-label="Observation filters"
								className="absolute right-0 z-30 mt-2 w-72 origin-top-right rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl sm:w-80"
							>
								<div className="mb-3 flex items-center justify-between">
									<p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
										Filter observations
									</p>
									<button
										type="button"
										onClick={() => setIsFilterOpen(false)}
										className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
										aria-label="Close filters"
									>
										✕
									</button>
								</div>

								<div className="space-y-3">
									<FilterSelect
										label="Availability"
										value={availability}
										onChange={setAvailability}
										options={[
											{ value: "", label: "All availability" },
											{ value: "AVAILABLE", label: "Available" },
											{ value: "OUT_OF_STOCK", label: "Out of stock" },
											{ value: "NOT_FOUND", label: "Not found" },
										]}
									/>

									<FilterSelect
										label="Review status"
										value={reviewStatus}
										onChange={setReviewStatus}
										options={[
											{ value: "", label: "All review statuses" },
											{ value: "PENDING", label: "Pending" },
											{ value: "APPROVED", label: "Approved" },
											{ value: "REJECTED", label: "Rejected" },
											{ value: "NEEDS_REVIEW", label: "Needs review" },
										]}
									/>

									<FilterSelect
										label="Sync status"
										value={syncStatus}
										onChange={setSyncStatus}
										options={[
											{ value: "", label: "All sync statuses" },
											{ value: "SYNCED", label: "Synced" },
											{ value: "PENDING", label: "Pending" },
											{ value: "SYNCING", label: "Syncing" },
											{ value: "FAILED", label: "Failed" },
										]}
									/>
								</div>

								<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
									<button
										type="button"
										onClick={clearFilters}
										disabled={!hasActiveFilters}
										className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
									>
										Reset all
									</button>
									<button
										type="button"
										onClick={() => setIsFilterOpen(false)}
										className="rounded-xl bg-[#A41821] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#7F1219]"
									>
										Apply
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{hasActiveFilters && (
					<div className="flex flex-wrap items-center gap-1.5">
						<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Active:
						</span>
						{availability && (
							<FilterChip
								label={`Availability: ${prettyEnum(availability)}`}
								onRemove={() => setAvailability("")}
							/>
						)}
						{reviewStatus && (
							<FilterChip
								label={`Review: ${prettyEnum(reviewStatus)}`}
								onRemove={() => setReviewStatus("")}
							/>
						)}
						{syncStatus && (
							<FilterChip
								label={`Sync: ${prettyEnum(syncStatus)}`}
								onRemove={() => setSyncStatus("")}
							/>
						)}
						{search.trim() && (
							<FilterChip
								label={`Search: "${search.trim()}"`}
								onRemove={() => setSearch("")}
							/>
						)}
						<button
							type="button"
							onClick={clearFilters}
							className="ml-1 cursor-pointer text-[11px] font-bold text-[#A41821] hover:underline"
						>
							Clear all
						</button>
					</div>
				)}

				<div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
					<span>
						Showing{" "}
						<span className="font-black text-slate-900">
							{filteredObservations.length}
						</span>{" "}
						of {observations.length}
					</span>
				</div>

				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
					<div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
						<h2 className="text-[11px] font-black uppercase tracking-wider text-slate-700 sm:text-xs">
							Observations ({filteredObservations.length})
						</h2>
						<span className="hidden text-[10px] text-slate-400 sm:inline">
							Tap a row for details
						</span>
					</div>

					{filteredObservations.length === 0 ? (
						<div className="px-6 py-10 text-center">
							<p className="text-xs font-medium text-slate-500">
								{hasActiveFilters
									? "No observations match your filters"
									: "No observations recorded yet"}
							</p>
							{hasActiveFilters && (
								<button
									type="button"
									onClick={clearFilters}
									className="mt-3 cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
								>
									Clear filters
								</button>
							)}
						</div>
					) : (
						<div className="divide-y divide-slate-100">
							{filteredObservations.map((obs) => (
								<ObservationRow
									key={obs.id}
									observation={obs}
									onClick={() => navigate(`/observations/${obs.id}`)}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

// ============================================================
// Sub-components
// ============================================================

const FilterSelect = ({ label, value, onChange, options }) => (
	<div>
		<label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
			{label}
		</label>
		<div className="relative">
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pr-9 text-xs font-semibold text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
			>
				{options.map((opt) => (
					<option key={opt.value || "all"} value={opt.value}>
						{opt.label}
					</option>
				))}
			</select>
			<svg
				className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				aria-hidden="true"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M19 9l-7 7-7-7"
				/>
			</svg>
		</div>
	</div>
);

const FilterChip = ({ label, onRemove }) => (
	<span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
		{label}
		<button
			type="button"
			onClick={onRemove}
			className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
			aria-label={`Remove ${label}`}
		>
			✕
		</button>
	</span>
);

const ObservationRow = ({ observation, onClick }) => {
	const product = observation.product;

	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left transition hover:bg-slate-50 active:bg-slate-100 sm:px-4"
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-bold text-slate-900 sm:text-[15px]">
						{formatProductName(product?.name || "Unknown product")}
					</span>
					<ObservationAvailabilityBadge
						availability={observation.availability}
					/>
				</div>

				<div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 font-mono text-[10px] text-slate-400 sm:text-[11px]">
					<span className="truncate">
						{product?.barcode || product?.sku || product?.id}
					</span>
					<span className="hidden sm:inline">•</span>
					<span className="hidden sm:inline">
						{formatCapturedAt(observation.capturedAt)}
					</span>
				</div>

				<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
					<ObservationReviewBadge status={observation.review?.status} />
					<ObservationSyncBadge status={observation.sync?.status} />
					<span className="text-[10px] text-slate-400 sm:hidden">
						{formatCapturedAt(observation.capturedAt)}
					</span>
				</div>
			</div>

			<div className="flex shrink-0 flex-col items-end">
				{observation.availability === "AVAILABLE" &&
				observation.price !== null &&
				observation.price !== undefined ? (
					<span className="font-mono text-sm font-black text-[#017C4D] sm:text-base">
						{formatPrice(observation.price)}
					</span>
				) : (
					<span className="text-[11px] font-semibold text-slate-500 sm:text-xs">
						{prettyEnum(observation.availability) || "—"}
					</span>
				)}
				<svg
					className="mt-1.5 h-4 w-4 text-slate-300"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 5l7 7-7 7"
					/>
				</svg>
			</div>
		</button>
	);
};

const prettyEnum = (value) => {
	if (!value) return "";
	return value
		.toLowerCase()
		.split("_")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
};

// Replace CollectionView in frontend/src/features/observations/pages/AuditObservationsPage.jsx:

const CollectionView = ({ audit, observations, auditId }) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const updateObservation = useUpdateObservation();
	const searchRef = useRef(null);

	// Local offline queue
	const { localObservations } = useLocalQueue(auditId);

	const queryKey = useMemo(
		() => ["observations", "audit", auditId, { limit: 200 }],
		[auditId],
	);

	const products = useMemo(
		() =>
			audit?.assignment?.items?.map((item) => item.product).filter(Boolean) ||
			[],
		[audit],
	);

	const observationsByProduct = useMemo(() => {
		const productMap = new Map(products.map((p) => [p.id, p]));
		const merged = new Map();

		for (const o of observations) {
			const key = o.clientObservationId || o.id;
			merged.set(key, {
				...o,
				__local: Boolean(o.__local),
				product: o.product || productMap.get(o.productId),
			});
		}

		for (const o of localObservations) {
			const key = o.clientObservationId || o.id;
			if (!merged.has(key)) {
				merged.set(key, {
					...o,
					__local: true,
					product: o.product || productMap.get(o.productId),
				});
			}
		}

		const byProduct = {};
		for (const o of merged.values()) {
			const existing = byProduct[o.productId];
			if (!existing) {
				byProduct[o.productId] = o;
				continue;
			}

			const oTime = new Date(o.capturedAt).getTime();
			const eTime = new Date(existing.capturedAt).getTime();

			if (oTime > eTime) {
				byProduct[o.productId] = o;
			} else if (oTime === eTime && existing.__local && !o.__local) {
				byProduct[o.productId] = o;
			}
		}

		return byProduct;
	}, [observations, localObservations, products]);

	const observationsByProductRef = useRef(observationsByProduct);
	useEffect(() => {
		observationsByProductRef.current = observationsByProduct;
	}, [observationsByProduct]);

	const productsRef = useRef(products);
	useEffect(() => {
		productsRef.current = products;
	}, [products]);

	const completedIds = useMemo(
		() => new Set(Object.keys(observationsByProduct)),
		[observationsByProduct],
	);

	const totalCount = products.length;
	const observedCount = completedIds.size;
	const pendingCount = Math.max(0, totalCount - observedCount);

	const [selectedProduct, setSelectedProduct] = useState(null);
	const [filterMode, setFilterMode] = useState("PENDING");
	const [showCompletionBanner, setShowCompletionBanner] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [autoAdvance, setAutoAdvance] = useState(true);

	// ────────────────────────────────────────────────────────────
	// DEDICATED SUBSTITUTE POPUP STATE (Intercepts Out of Stock & Not Carried)
	// ────────────────────────────────────────────────────────────
	const [substituteModalState, setSubstituteModalState] = useState(null);
	// Shape: { product, availability: 'OUT_OF_STOCK' | 'NOT_FOUND' } | null
	const [substituteDescription, setSubstituteDescription] = useState("");
	const [substituteShelfPrice, setSubstituteShelfPrice] = useState("");
	const [substituteModalError, setSubstituteModalError] = useState("");

	const [isOnline, setIsOnline] = useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);
	const [isSyncingQueue, setIsSyncingQueue] = useState(false);

	const completionShownRef = useRef(false);
	const inFlightProductsRef = useRef(new Set());
	const saveChainRef = useRef(Promise.resolve());

	const currentProductPosition = useMemo(() => {
		if (!selectedProduct) return 1;
		const pId = selectedProduct.id || selectedProduct.productId;
		return products.findIndex((p) => p.id === pId) + 1;
	}, [selectedProduct, products]);

	const firstPendingProduct = useMemo(() => {
		return products.find((p) => !completedIds.has(p.id)) || null;
	}, [products, completedIds]);

	const resumeIndex = useMemo(() => {
		if (!firstPendingProduct) return totalCount;
		return products.findIndex((p) => p.id === firstPendingProduct.id) + 1;
	}, [products, firstPendingProduct, totalCount]);

	const findNextProduct = useCallback(
		(currentPId, onlyUncompleted = true) => {
			const currentIdx = products.findIndex((p) => p.id === currentPId);
			if (currentIdx === -1) return null;

			for (let i = currentIdx + 1; i < products.length; i++) {
				const candidate = products[i];
				if (!onlyUncompleted || !completedIds.has(candidate.id)) {
					return candidate;
				}
			}

			for (let i = 0; i < currentIdx; i++) {
				const candidate = products[i];
				if (!onlyUncompleted || !completedIds.has(candidate.id)) {
					return candidate;
				}
			}

			return null;
		},
		[products, completedIds],
	);

	const handleSkipNext = () => {
		if (!selectedProduct) return;
		const next = findNextProduct(
			selectedProduct.id || selectedProduct.productId,
			false,
		);
		if (next) setSelectedProduct(next);
	};

	const handleSkipPrev = () => {
		if (!selectedProduct) return;
		const currentIdx = products.findIndex(
			(p) => p.id === (selectedProduct.id || selectedProduct.productId),
		);
		const prevIdx = currentIdx > 0 ? currentIdx - 1 : products.length - 1;
		setSelectedProduct(products[prevIdx]);
	};

	const invalidateDependentQueries = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: ["observations", "audit", auditId],
		});
		queryClient.invalidateQueries({ queryKey: ["observations", "list"] });
		queryClient.invalidateQueries({
			queryKey: ["audits", "detail", auditId],
		});
		queryClient.invalidateQueries({ queryKey: ["audits"] });
		queryClient.invalidateQueries({ queryKey: ["dashboard"] });
	}, [queryClient, auditId]);

	const runQueueFlush = useCallback(async () => {
		setIsSyncingQueue(true);
		try {
			const result = await flushQueue();
			if (result.synced > 0) {
				toast.success(
					`Synced ${result.synced} offline observation${result.synced === 1 ? "" : "s"}`,
					{ id: "queue-sync-toast", duration: 2000 },
				);
			}
			if (result.failed > 0) {
				toast.error(
					`${result.failed} offline observation${result.failed === 1 ? "" : "s"} could not be saved`,
					{ id: "queue-sync-toast-failed", duration: 3000 },
				);
			}
		} finally {
			setIsSyncingQueue(false);
			invalidateDependentQueries();
		}
	}, [invalidateDependentQueries]);

	const upsertObservationInCache = useCallback(
		(formattedObservation) => {
			queryClient.setQueryData(queryKey, (previous) => {
				if (!previous) return previous;
				const list = previous.observations || [];
				const withoutDupes = list.filter(
					(o) =>
						o.id !== formattedObservation.id &&
						o.clientObservationId !==
							formattedObservation.clientObservationId &&
						!(
							o.productId === formattedObservation.productId &&
							new Date(o.capturedAt).getTime() <=
								new Date(formattedObservation.capturedAt).getTime()
						),
				);
				const nextList = [formattedObservation, ...withoutDupes].sort(
					(a, b) =>
						new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
				);
				return { ...previous, observations: nextList };
			});
		},
		[queryClient, queryKey],
	);

	const handleSelectProduct = useCallback((product) => {
		const normalized = product?.productId
			? { ...product, id: product.productId }
			: product;
		const existing = observationsByProductRef.current[normalized.id] || null;
		setSelectedProduct({ ...normalized, _existingObservation: existing });
	}, []);

	const handleCancel = useCallback(() => {
		setSelectedProduct(null);
		setTimeout(() => searchRef.current?.focusInput(), 60);
	}, []);
const performSave = useCallback(
	async ({
		productId,
		price,
		availability,
		substituteProduct,
		evidencePhotoUrl,
	}) => {
		const existing = observationsByProductRef.current[productId];
		const currentProducts = productsRef.current;
		const online = navigator.onLine;

		const productName = formatProductName(
			currentProducts.find((p) => p.id === productId)?.name || "Item",
		);

		const isExistingServerRow = existing && existing.id && !existing.__local;
		const hasSub = Boolean(substituteProduct?.trim());
		const finalPrice = availability === "AVAILABLE" || hasSub ? price : null;

		// CRITICAL FIX: If evidencePhotoUrl is explicitly passed (even as null when removed),
		// do NOT fall back to existing.evidencePhotoUrl.
		const finalEvidencePhotoUrl =
			evidencePhotoUrl !== undefined
				? evidencePhotoUrl
				: (existing?.evidencePhotoUrl ?? null);

		if (isExistingServerRow && online) {
			const optimistic = {
				...existing,
				availability,
				price: finalPrice,
				substituteProduct: substituteProduct?.trim() || null,
				evidencePhotoUrl: finalEvidencePhotoUrl,
				capturedAt: new Date().toISOString(),
				sync: { ...(existing.sync || {}), status: "SYNCED" },
			};
			upsertObservationInCache(optimistic);

			try {
				const response = await updateObservation.mutateAsync({
					observationId: existing.id,
					payload: {
						price: finalPrice,
						availability,
						substituteProduct: substituteProduct?.trim() || null,
						evidencePhotoUrl: finalEvidencePhotoUrl,
					},
				});
				if (response?.data) {
					upsertObservationInCache(response.data);
				}
				toast.success(
					availability === "AVAILABLE"
						? `${productName}: ${Number(price).toFixed(2)} ETB`
						: hasSub
							? `${productName} (${availability.replace("_", " ")}): Substitute logged`
							: `${productName}: ${availability.replace("_", " ")}`,
					{ id: "observation-toast", duration: 1500 },
				);
				invalidateDependentQueries();
				return;
			} catch (err) {
				upsertObservationInCache(existing);
				toast.error(
					err?.response?.data?.message || "Unable to update observation",
				);
				return;
			}
		}

		const clientObservationId = buildClientObservationId(auditId, productId);
		const isUpdate = Boolean(
			existing && (existing.id || existing.serverObservationId),
		);

		const payload = {
			clientObservationId,
			auditId,
			productId,
			availability,
			price: finalPrice,
			substituteProduct: substituteProduct?.trim() || null,
			observedUnit: existing?.observedUnit || null,
			packageSize: existing?.packageSize || null,
			capturedAt: new Date().toISOString(),
			evidencePhotoUrl: finalEvidencePhotoUrl,
			notes: existing?.notes || null,
			operation: isUpdate ? "UPDATE" : "CREATE",
			serverObservationId: isUpdate
				? existing.serverObservationId || existing.id
				: null,
		};

		const optimisticObservation = {
			id: payload.serverObservationId || clientObservationId,
			clientObservationId,
			auditId,
			productId,
			availability: payload.availability,
			price: payload.price,
			substituteProduct: payload.substituteProduct,
			evidencePhotoUrl: payload.evidencePhotoUrl,
			capturedAt: payload.capturedAt,
			sync: { status: "PENDING", attempts: 0 },
			review: { status: existing?.review?.status || "PENDING" },
			product: currentProducts.find((p) => p.id === productId) || undefined,
			__local: true,
		};
		upsertObservationInCache(optimisticObservation);

		try {
			const queued = await enqueueObservation(payload);

			if (!online) {
				toast.success(`${productName} saved offline — will sync when online`, {
					id: "observation-toast",
					duration: 1800,
				});
				return;
			}

			const result = await syncObservation(queued);
			if (result.success && result.data) {
				upsertObservationInCache(result.data);
				invalidateDependentQueries();
				toast.success(
					availability === "AVAILABLE"
						? `${productName}: ${Number(price).toFixed(2)} ETB`
						: hasSub
							? `${productName} (${availability.replace("_", " ")}): Substitute logged`
							: `${productName}: ${availability.replace("_", " ")}`,
					{ id: "observation-toast", duration: 1500 },
				);
			}
		} catch {
			toast.error("Unable to save observation locally");
		}
	},
	[
		auditId,
		updateObservation,
		upsertObservationInCache,
		invalidateDependentQueries,
	],
);

	const persistObservation = useCallback(
		({
			productId,
			price,
			availability,
			substituteProduct,
			evidencePhotoUrl,
		}) => {
			if (inFlightProductsRef.current.has(productId)) {
				toast("Already saving…", { id: "obs-in-flight", duration: 800 });
				return Promise.resolve();
			}
			inFlightProductsRef.current.add(productId);
			setIsSaving(true);

			const run = saveChainRef.current
				.catch(() => {})
				.then(() =>
					performSave({
						productId,
						price,
						availability,
						substituteProduct,
						evidencePhotoUrl,
					}),
				)
				.catch(() => {});

			saveChainRef.current = run;
			run.finally(() => {
				inFlightProductsRef.current.delete(productId);
				if (
					saveChainRef.current === run &&
					inFlightProductsRef.current.size === 0
				) {
					setIsSaving(false);
				}
			});
			return run;
		},
		[performSave],
	);

	const handleSavePrice = useCallback(
		async ({ productId, price, availability, evidencePhotoUrl }) => {
			await persistObservation({
				productId,
				price,
				availability,
				evidencePhotoUrl,
			});

			if (autoAdvance) {
				const next = findNextProduct(productId, true);
				if (next) {
					handleSelectProduct(next);
				} else {
					setSelectedProduct(null);
					toast.success("All assigned items completed!", { icon: "🎉" });
					setTimeout(() => searchRef.current?.focusInput(), 60);
				}
			} else {
				setSelectedProduct(null);
				setTimeout(() => searchRef.current?.focusInput(), 60);
			}
		},
		[autoAdvance, findNextProduct, handleSelectProduct, persistObservation],
	);
const handleTriggerUnavailableModal = useCallback(
	({
		productId,
		availability,
		price,
		substituteProduct,
		isExplicitWithoutSubstitute,
		evidencePhotoUrl,
	}) => {
		// If already confirmed with substitute OR explicitly confirmed without substitute in RapidPriceInput, SAVE DIRECTLY!
		if (substituteProduct || isExplicitWithoutSubstitute) {
			persistObservation({
				productId,
				price: substituteProduct ? price : null,
				availability,
				substituteProduct: substituteProduct || null,
				evidencePhotoUrl,
			});

			if (autoAdvance) {
				const next = findNextProduct(productId, true);
				if (next) handleSelectProduct(next);
				else setSelectedProduct(null);
			} else {
				setSelectedProduct(null);
			}
			return;
		}

		// Only open popup modal if triggered from an external action without an inline drawer
		const targetProd =
			products.find((p) => p.id === productId) || selectedProduct;
		setSubstituteDescription("");
		setSubstituteShelfPrice("");
		setSubstituteModalError("");
		setSubstituteModalState({
			product: targetProd,
			availability,
			evidencePhotoUrl,
		});
	},
	[
		products,
		selectedProduct,
		autoAdvance,
		findNextProduct,
		handleSelectProduct,
		persistObservation,
	],
);



	// Confirm substitute from Modal
	const handleConfirmSubstituteFromModal = async () => {
		if (!substituteDescription.trim()) {
			setSubstituteModalError("Please describe the substitute product found on shelf");
			return;
		}

		const numPrice = parseFloat(substituteShelfPrice);
		if (isNaN(numPrice) || numPrice <= 0) {
			setSubstituteModalError("Please enter the price of the substitute product");
			return;
		}

		const prodId = substituteModalState.product.id;
		const avail = substituteModalState.availability;
		const desc = substituteDescription.trim();

		setSubstituteModalState(null);

		await persistObservation({
			productId: prodId,
			price: numPrice,
			availability: avail,
			substituteProduct: desc,
		});

		if (autoAdvance) {
			const next = findNextProduct(prodId, true);
			if (next) {
				handleSelectProduct(next);
			} else {
				setSelectedProduct(null);
				toast.success("All assigned items completed!", { icon: "🎉" });
				setTimeout(() => searchRef.current?.focusInput(), 60);
			}
		} else {
			setSelectedProduct(null);
		}
	};

	// Confirm plain Out of Stock without substitute from Modal
	const handleConfirmPlainUnavailable = async () => {
		const prodId = substituteModalState.product.id;
		const avail = substituteModalState.availability;

		setSubstituteModalState(null);

		await persistObservation({
			productId: prodId,
			price: null,
			availability: avail,
			substituteProduct: null,
		});

		if (autoAdvance) {
			const next = findNextProduct(prodId, true);
			if (next) {
				handleSelectProduct(next);
			} else {
				setSelectedProduct(null);
				toast.success("All assigned items completed!", { icon: "🎉" });
				setTimeout(() => searchRef.current?.focusInput(), 60);
			}
		} else {
			setSelectedProduct(null);
		}
	};

	const store = audit.store;
	const auditor = audit.auditor;
	const surveyPeriod = audit.surveyPeriod;

	const pendingProducts = products.filter((p) => !completedIds.has(p.id));
	const completedProducts = products.filter((p) => completedIds.has(p.id));

	const visibleProducts =
		filterMode === "PENDING"
			? pendingProducts
			: filterMode === "COMPLETED"
				? completedProducts
				: products;

	return (
		<div className="mx-auto max-w-2xl space-y-3 pb-24">
			{/* Sticky Top Header */}
			<div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
				<div className="px-3 pt-2.5 sm:px-4 sm:pt-3">
					<BackButton navigate={navigate} auditId={auditId} />

					<div className="mt-1 flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<h1 className="truncate text-base font-black text-slate-900 sm:text-lg">
								{store?.name || "Unknown store"}
							</h1>
							<p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
								{store?.competitor?.name}
								{store?.area && ` • ${store.area}`}
								{surveyPeriod?.name && ` • ${surveyPeriod.name}`}
							</p>
						</div>
						<div className="flex flex-col items-end gap-1">
							<span className="text-xs font-black tabular-nums text-slate-900">
								{observedCount} / {totalCount}
							</span>
							{auditor && (
								<span className="text-[10px] text-slate-400">
									{auditor.name}
								</span>
							)}
						</div>
					</div>

					<div className="mt-2.5 pb-2.5 sm:mt-3 sm:pb-3.5">
						<ObservationProgress observed={observedCount} total={totalCount} />
					</div>
				</div>
			</div>

			<div className="space-y-3 px-3 pt-3 sm:space-y-4 sm:px-4 sm:pt-4">
				{/* Rapid Price Input */}
				{selectedProduct && (
					<RapidPriceInput
						selectedProduct={selectedProduct}
						currentIndex={currentProductPosition}
						totalItems={totalCount}
						autoAdvance={autoAdvance}
						onToggleAutoAdvance={() => setAutoAdvance((prev) => !prev)}
						onSavePrice={handleSavePrice}
						onSaveAvailability={handleTriggerUnavailableModal} // <-- INTERCEPTED HERE!
						onNext={handleSkipNext}
						onPrev={handleSkipPrev}
						onCancel={handleCancel}
						isSaving={isSaving}
					/>
				)}

				{/* Search Bar */}
				{!selectedProduct && (
					<FastProductSearch
						ref={searchRef}
						products={products}
						completedProductIds={completedIds}
						onSelectProduct={handleSelectProduct}
						disabled={false}
					/>
				)}

				{/* Product Checklist */}
				{!selectedProduct && (
					<div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
						<div className="mb-3 flex items-center justify-between gap-2">
							<h2 className="text-[11px] font-black uppercase tracking-wider text-slate-700 sm:text-xs">
								Products ({visibleProducts.length})
							</h2>
							<div className="flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
								{[
									{ key: "PENDING", label: `Pending (${pendingCount})` },
									{ key: "COMPLETED", label: `Done (${observedCount})` },
									{ key: "ALL", label: `All (${totalCount})` },
								].map((tab) => (
									<button
										key={tab.key}
										type="button"
										onClick={() => setFilterMode(tab.key)}
										className={`shrink-0 rounded-md px-2 py-0.5 transition ${
											filterMode === tab.key
												? "bg-white text-slate-900 shadow-xs"
												: "text-slate-500 hover:text-slate-700"
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>
						</div>

						<div className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto">
						{visibleProducts.map((product, pIdx) => {
	const obs = observationsByProduct[product.id];
	const isDone = Boolean(obs);
	const hasSubstitute = Boolean(obs?.substituteProduct);
	const isUnavailable =
		obs?.availability === "OUT_OF_STOCK" ||
		obs?.availability === "NOT_FOUND";

	return (
		<button
			key={product.id}
			type="button"
			onClick={() => handleSelectProduct(product)}
			className="flex w-full items-center justify-between gap-3 rounded-lg p-2.5 text-left transition hover:bg-slate-50 active:bg-slate-100"
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-1.5">
					<span className="font-mono text-xs font-semibold text-slate-400">
						#{pIdx + 1}
					</span>
					{/* Original Product: struck through if substituted */}
					<span
						className={`block truncate text-sm font-bold ${
							isUnavailable && hasSubstitute
								? "text-slate-400 line-through decoration-slate-400"
								: "text-slate-900"
						}`}
					>
						{formatProductName(product.name)}
					</span>
				</div>

				{/* Underneath Substituted Product Entry */}
				{isUnavailable && hasSubstitute && (
					<div className="flex items-center gap-1.5 pl-5 pt-0.5 font-sans">
						<span className="text-[10px] font-bold text-[#FE7914]">↳ Sub:</span>
						<span className="truncate rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
							{obs.substituteProduct}
						</span>
					</div>
				)}

				<div className="mt-0.5 truncate pl-5 font-mono text-[10px] text-slate-400">
					{product.barcode || product.sku || product.id}
				</div>
			</div>

			<div className="shrink-0 text-right">
				{isDone ? (
					<div className="flex items-center gap-1.5">
						<ObservationAvailabilityBadge
							availability={obs.availability}
						/>
						{obs.price !== null && obs.price !== undefined && (
							<div>
								<span className="font-mono text-xs font-black text-[#017C4D]">
									{formatPrice(obs.price)}
								</span>
								{hasSubstitute && (
									<span className="block text-[8px] font-bold uppercase tracking-wider text-[#FE7914]">
										Sub Price
									</span>
								)}
							</div>
						)}
					</div>
				) : (
					<span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
						+ Price
					</span>
				)}
			</div>
		</button>
	);
})}
						</div>
					</div>
				)}
			</div>

			{/* ========================================================= */}
			{/* DEDICATED SUBSTITUTE POPUP DIALOG (PORTAL MODAL)          */}
			{/* ========================================================= */}
			{substituteModalState && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
					<div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 space-y-4">
						<div className="flex items-start justify-between border-b border-slate-100 pb-3">
							<div>
								<span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#FE7914]">
									{substituteModalState.availability === "OUT_OF_STOCK"
										? "Out of Stock Action"
										: "Not Carried Action"}
								</span>
								<h3 className="mt-1 text-base font-bold text-slate-900">
									{formatProductName(substituteModalState.product.name)}
								</h3>
								<p className="text-xs text-slate-500 font-mono">
									CODE: {substituteModalState.product.barcode || substituteModalState.product.id}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setSubstituteModalState(null)}
								className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
							>
								✕
							</button>
						</div>

						<div className="space-y-3">
							<div>
								<label className="block text-xs font-bold text-slate-800 mb-1">
									Substitute Product Found on Shelf
								</label>
								<input
									type="text"
									autoFocus
									placeholder={
										substituteModalState.availability === "OUT_OF_STOCK"
											? "e.g. Dove OOS, captured Lux 150g"
											: "e.g. Not carried, captured local garlic 250g"
									}
									value={substituteDescription}
									onChange={(e) => {
										setSubstituteDescription(e.target.value);
										setSubstituteModalError("");
									}}
									className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs text-slate-900 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden font-medium"
								/>
							</div>

							<div>
								<label className="block text-xs font-bold text-slate-800 mb-1">
									Substitute Shelf Price (ETB)
								</label>
								<div className="relative">
									<input
										type="number"
										step="0.01"
										placeholder="0.00"
										value={substituteShelfPrice}
										onChange={(e) => {
											setSubstituteShelfPrice(e.target.value);
											setSubstituteModalError("");
										}}
										className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-14 text-sm font-bold font-mono text-slate-900 focus:border-[#A41821] outline-hidden"
									/>
									<span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 font-mono">
										ETB
									</span>
								</div>
							</div>

							{substituteModalError && (
								<p className="text-xs font-semibold text-[#A41821]">{substituteModalError}</p>
							)}

							<div className="pt-2 flex flex-col gap-2">
								<button
									type="button"
									onClick={handleConfirmSubstituteFromModal}
									disabled={isSaving}
									className="w-full rounded-xl bg-[#FE7914] hover:bg-[#D45F06] py-3 text-xs font-bold text-white shadow-xs transition cursor-pointer"
								>
									Save with Substitute (Enter ↵)
								</button>

								<button
									type="button"
									onClick={handleConfirmPlainUnavailable}
									disabled={isSaving}
									className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2.5 text-xs font-semibold text-slate-600 transition cursor-pointer"
								>
									No Substitute on Shelf (Record Plain {substituteModalState.availability.replace("_", " ")})
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

const BackButton = ({ navigate, auditId }) => (
	<div className="flex items-center gap-1.5">
		<button
			type="button"
			onClick={() => navigate("/audits")}
			className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
		>
			<svg
				className="h-3.5 w-3.5"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M15 19l-7-7 7-7"
				/>
			</svg>
			All visits
		</button>
		<span className="text-xs text-slate-300">/</span>
		<button
			type="button"
			onClick={() => navigate(`/audits/${auditId}`)}
			className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
		>
			Visit overview
		</button>
	</div>
);
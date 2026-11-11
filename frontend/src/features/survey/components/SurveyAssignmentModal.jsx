import React, {
	useState,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from "react";
import { useStores } from "../hooks/useStores.js";
import {
	useCreateBatchAssignment,
	useUpdateStoreAllocations,
} from "../hooks/useAssignments.js";
import { usePeriods } from "../hooks/usePeriods.js";
import { useUsers } from "@/features/users/hooks/useUsers.js";
import { useProducts } from "@/features/products/hooks/useProducts.js";
import { getStoreAllocationsRequest } from "@/services/api/assignment.api.js";
import { formatProductName } from "@/utils/formatters.js";
import toast from "react-hot-toast";

/**
 * Computes equal slices across total items for N field auditors
 */
const calculateEqualSlices = (totalItems, count) => {
	if (totalItems <= 0 || count <= 0) return [];
	const base = Math.floor(totalItems / count);
	const remainder = totalItems % count;

	const slices = [];
	let currentStart = 0;

	for (let i = 0; i < count; i++) {
		const extra = i >= count - remainder ? 1 : 0;
		const len = base + extra;
		const start = currentStart;
		const end = start + len;

		slices.push({
			sliceIndex: i,
			fromNumber: len > 0 ? start + 1 : 0,
			toNumber: end,
			count: len,
			startIndex: start,
			endIndex: end,
		});
		currentStart = end;
	}
	return slices;
};

export const SurveyAssignmentModal = ({
	isOpen,
	onClose,
	storeId: initialStoreId = null,
	surveyPeriodId: initialSurveyPeriodId = null,
}) => {
	const { stores = [], isLoading: storesLoading } = useStores();
	const { users = [] } = useUsers();
	const { products = [], isLoading: productsLoading } = useProducts();
	const { activePeriod, periods = [] } = usePeriods();

	const createBatch = useCreateBatchAssignment();
	const updateAllocations = useUpdateStoreAllocations();

	const openPeriods = useMemo(
		() => (periods || []).filter((p) => p.status === "OPEN"),
		[periods],
	);

	// Group daily cycles under their respective weekly parent cycles
	const { weeklyPeriods, dailyByWeekly } = useMemo(() => {
		const weekly = [];
		const dailyMap = {};

		openPeriods.forEach((p) => {
			const isDaily =
				p.id.includes("-DAILY-") || p.name?.toLowerCase().includes("daily");

			if (isDaily) {
				const parentKey = p.id.split("-DAILY-")[0];
				if (!dailyMap[parentKey]) dailyMap[parentKey] = [];
				dailyMap[parentKey].push(p);
			} else {
				weekly.push(p);
			}
		});

		Object.keys(dailyMap).forEach((k) => {
			dailyMap[k].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
		});

		return { weeklyPeriods: weekly, dailyByWeekly: dailyMap };
	}, [openPeriods]);

	const auditors = useMemo(
		() =>
			(users || []).filter(
				(u) => u.role === "FIELD_AUDITOR" && u.active !== false,
			),
		[users],
	);

	const [surveyPeriodId, setSurveyPeriodId] = useState("");
	const [storeId, setStoreId] = useState("");

	// Custom collapsible cycle dropdown state
	const [isCycleDropdownOpen, setIsCycleDropdownOpen] = useState(false);
	const [expandedWeeklyCycles, setExpandedWeeklyCycles] = useState({});
	const dropdownRef = useRef(null);

	// Product selection pool: Start completely empty (0 selected) by default
	const [selectedProductIds, setSelectedProductIds] = useState([]);

	// Tabs: 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'BI_YEARLY'
	const [activeProductTab, setActiveProductTab] = useState("ALL");
	const [checklistSearch, setChecklistSearch] = useState("");

	// Multi-Auditor Allocation State
	const [allocations, setAllocations] = useState([]);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isLoadingExisting, setIsLoadingExisting] = useState(false);

	// ─── Survey Tracks (Exact p.frequency from Item Master) ──────────
	const dailyFreshProducts = useMemo(
		() => products.filter((p) => p.frequency === "DAILY"),
		[products],
	);

	const weeklyProducts = useMemo(
		() => products.filter((p) => p.frequency === "WEEKLY"),
		[products],
	);

	const monthlyProducts = useMemo(
		() => products.filter((p) => p.frequency === "MONTHLY"),
		[products],
	);

	const biYearlyProducts = useMemo(
		() =>
			products.filter(
				(p) =>
					p.frequency === "BI_YEARLY" ||
					(!p.frequency &&
						p.frequency !== "DAILY" &&
						p.frequency !== "WEEKLY" &&
						p.frequency !== "MONTHLY"),
			),
		[products],
	);

	// Active Selected Counts per Track
	const selectedDailyCount = useMemo(
		() =>
			dailyFreshProducts.filter((p) => selectedProductIds.includes(p.id))
				.length,
		[dailyFreshProducts, selectedProductIds],
	);

	const selectedWeeklyCount = useMemo(
		() =>
			weeklyProducts.filter((p) => selectedProductIds.includes(p.id)).length,
		[weeklyProducts, selectedProductIds],
	);

	const selectedMonthlyCount = useMemo(
		() =>
			monthlyProducts.filter((p) => selectedProductIds.includes(p.id)).length,
		[monthlyProducts, selectedProductIds],
	);

	const selectedBiYearlyCount = useMemo(
		() =>
			biYearlyProducts.filter((p) => selectedProductIds.includes(p.id)).length,
		[biYearlyProducts, selectedProductIds],
	);

	// Recalibrates auditor allocation slices
	const updateAllocationsForCount = useCallback(
		(newCount, currentAllocations) => {
			if (!currentAllocations || currentAllocations.length === 0)
				return currentAllocations;

			if (newCount === 0) {
				return currentAllocations.map((a) => ({
					...a,
					fromNumber: 0,
					toNumber: 0,
					count: 0,
				}));
			}

			const slices = calculateEqualSlices(newCount, currentAllocations.length);
			return currentAllocations.map((a, idx) => ({
				...a,
				fromNumber: slices[idx]?.fromNumber || 1,
				toNumber: slices[idx]?.toNumber || newCount,
				count: slices[idx]?.count || newCount,
			}));
		},
		[],
	);

	// Reset state when modal opens or closes
	useEffect(() => {
		if (!isOpen) {
			setSelectedProductIds([]);
			setActiveProductTab("ALL");
			setChecklistSearch("");
			setAllocations([]);
			setIsEditMode(false);
			setIsCycleDropdownOpen(false);
			return;
		}

		const defaultCycleId =
			initialSurveyPeriodId || activePeriod?.id || openPeriods[0]?.id || "";

		setSurveyPeriodId(defaultCycleId);
		setStoreId(initialStoreId || stores[0]?.id || "");

		// Clean new dispatch: start completely unselected
		if (!initialStoreId) {
			setSelectedProductIds([]);
			setIsEditMode(false);
		}
	}, [
		isOpen,
		activePeriod,
		openPeriods,
		initialStoreId,
		initialSurveyPeriodId,
		stores,
	]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (e) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
				setIsCycleDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const productsRef = useRef(products);
	productsRef.current = products;

	// Load existing allocations ONLY when editing an existing dispatch
	useEffect(() => {
		if (!isOpen || !storeId || !surveyPeriodId) return;

		// If brand-new dispatch, do not load or pre-select prior allocations
		if (!initialStoreId) {
			setIsEditMode(false);
			setSelectedProductIds([]);
			return;
		}

		let isMounted = true;
		setIsLoadingExisting(true);

		getStoreAllocationsRequest({ storeId, surveyPeriodId })
			.then((res) => {
				if (!isMounted) return;
				const existing = res?.data || [];

				if (existing.length > 0) {
					setIsEditMode(true);
					const allAssignedIds = Array.from(
						new Set(existing.flatMap((asn) => asn.productIds || [])),
					);
					setSelectedProductIds(allAssignedIds);

					const currentProducts = productsRef.current || [];
					const mapped = existing.map((asn) => {
						const firstIdx = currentProducts.findIndex(
							(p) => p.id === asn.productIds[0],
						);
						const lastIdx = currentProducts.findIndex(
							(p) => p.id === asn.productIds[asn.productIds.length - 1],
						);

						return {
							auditorId: asn.auditorId,
							fromNumber: firstIdx !== -1 ? firstIdx + 1 : 1,
							toNumber: lastIdx !== -1 ? lastIdx + 1 : asn.productIds.length,
							count: asn.productIds.length,
							observedCount: asn.observedCount || 0,
							assignmentId: asn.assignmentId,
							status: asn.status || "NOT_STARTED",
						};
					});
					setAllocations(mapped);
				} else {
					setIsEditMode(false);
					setSelectedProductIds([]);
				}
			})
			.catch(() => {
				if (isMounted) setIsEditMode(false);
			})
			.finally(() => {
				if (isMounted) setIsLoadingExisting(false);
			});

		return () => {
			isMounted = false;
		};
	}, [isOpen, storeId, surveyPeriodId, initialStoreId]);

	// Product Selection Handlers
	const handleToggleProduct = (productId) => {
		setSelectedProductIds((prev) => {
			const next = prev.includes(productId)
				? prev.filter((id) => id !== productId)
				: [...prev, productId];
			setAllocations((cur) => updateAllocationsForCount(next.length, cur));
			return next;
		});
	};

	const handleSelectAllGlobal = () => {
		if (selectedProductIds.length === products.length) {
			setSelectedProductIds([]);
			setAllocations((cur) => updateAllocationsForCount(0, cur));
			toast.success("Deselected all products");
		} else {
			const allIds = products.map((p) => p.id);
			setSelectedProductIds(allIds);
			setAllocations((cur) => updateAllocationsForCount(allIds.length, cur));
			toast.success(`Selected all ${allIds.length} products`);
		}
	};

	// Track Deselection: If ANY items in this track are selected, DESELECT them!
	const handleToggleCategory = (trackProducts, trackLabel) => {
		const trackIds = trackProducts.map((p) => p.id);
		if (trackIds.length === 0) return;

		const selectedInTrack = trackIds.filter((id) =>
			selectedProductIds.includes(id),
		);

		if (selectedInTrack.length > 0) {
			setSelectedProductIds((prev) => {
				const next = prev.filter((id) => !trackIds.includes(id));
				setAllocations((cur) => updateAllocationsForCount(next.length, cur));
				return next;
			});
			toast.success(`Deselected ${selectedInTrack.length} ${trackLabel} items`);
		} else {
			setSelectedProductIds((prev) => {
				const next = Array.from(new Set([...prev, ...trackIds]));
				setAllocations((cur) => updateAllocationsForCount(next.length, cur));
				return next;
			});
			toast.success(`Selected all ${trackIds.length} ${trackLabel} items`);
		}
	};

	const handleRebalanceEqually = () => {
		if (allocations.length === 0 || selectedProductIds.length === 0) return;
		const slices = calculateEqualSlices(
			selectedProductIds.length,
			allocations.length,
		);

		setAllocations((prev) =>
			prev.map((item, idx) => ({
				...item,
				fromNumber: slices[idx]?.fromNumber || 1,
				toNumber: slices[idx]?.toNumber || selectedProductIds.length,
				count: slices[idx]?.count || selectedProductIds.length,
			})),
		);
		toast.success("Re-balanced ranges across active selected items");
	};

	const handleToggleAuditor = (auditorIdToToggle) => {
		const exists = allocations.find((a) => a.auditorId === auditorIdToToggle);
		let updated;

		if (exists) {
			updated = allocations.filter((a) => a.auditorId !== auditorIdToToggle);
		} else {
			updated = [
				...allocations,
				{
					auditorId: auditorIdToToggle,
					fromNumber: 0,
					toNumber: 0,
					count: 0,
					observedCount: 0,
					status: "NOT_STARTED",
				},
			];
		}

		setAllocations(
			updateAllocationsForCount(selectedProductIds.length, updated),
		);
	};

	const handleRangeChange = (auditorIdToEdit, field, val) => {
		const parsed = Math.max(0, parseInt(val, 10) || 0);
		setAllocations((prev) =>
			prev.map((a) => {
				if (a.auditorId !== auditorIdToEdit) return a;
				const from = field === "fromNumber" ? parsed : a.fromNumber;
				const to = field === "toNumber" ? parsed : a.toNumber;
				return {
					...a,
					[field]: parsed,
					count: to >= from && from > 0 ? to - from + 1 : 0,
				};
			}),
		);
	};

	// Filtered products list for checklist view
	const displayedChecklist = useMemo(() => {
		let list = products;
		if (activeProductTab === "DAILY") {
			list = dailyFreshProducts;
		} else if (activeProductTab === "WEEKLY") {
			list = weeklyProducts;
		} else if (activeProductTab === "MONTHLY") {
			list = monthlyProducts;
		} else if (activeProductTab === "BI_YEARLY") {
			list = biYearlyProducts;
		}

		if (!checklistSearch.trim()) return list;
		const term = checklistSearch.toLowerCase().trim();
		return list.filter(
			(p) =>
				p.name?.toLowerCase().includes(term) ||
				p.sku?.toLowerCase().includes(term) ||
				p.barcode?.toLowerCase().includes(term),
		);
	}, [
		products,
		dailyFreshProducts,
		weeklyProducts,
		monthlyProducts,
		biYearlyProducts,
		activeProductTab,
		checklistSearch,
	]);

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!storeId) return toast.error("Please select a target store location");
		if (!surveyPeriodId)
			return toast.error("Please select an open survey period");
		if (allocations.length === 0)
			return toast.error("Please select at least one field auditor");
		if (selectedProductIds.length === 0)
			return toast.error("Please select at least one product to audit");

		const activeProductsPool = products.filter((p) =>
			selectedProductIds.includes(p.id),
		);

		const formattedAllocations = allocations.map((alloc) => {
			const from = Math.max(1, alloc.fromNumber || 1);
			const to = Math.min(
				activeProductsPool.length,
				Math.max(from, alloc.toNumber || activeProductsPool.length),
			);
			const allocatedSlice = activeProductsPool
				.slice(from - 1, to)
				.map((p) => p.id);

			return {
				auditorId: alloc.auditorId,
				productIds:
					allocatedSlice.length > 0
						? allocatedSlice
						: [activeProductsPool[0]?.id],
			};
		});

		const payload = {
			storeId,
			surveyPeriodId,
			allocations: formattedAllocations,
			previousStoreId:
				initialStoreId && initialStoreId !== storeId
					? initialStoreId
					: undefined,
			// Send previousSurveyPeriodId so the backend migrates the existing completed dispatch
			previousSurveyPeriodId:
				initialSurveyPeriodId && initialSurveyPeriodId !== surveyPeriodId
					? initialSurveyPeriodId
					: undefined,
		};

		try {
			if (isEditMode) {
				await updateAllocations.mutateAsync(payload);
			} else {
				await createBatch.mutateAsync(payload);
			}
			onClose();
		} catch {
			// Mutation hook handles error
		}
	};

	if (!isOpen) return null;

	const selectedStore = stores.find((s) => s.id === storeId);
	const selectedCycleObj = openPeriods.find((p) => p.id === surveyPeriodId);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in">
			<div className="flex max-h-[92vh] w-full max-w-2xl flex-col space-y-4 rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-2xl">
				{/* Header */}
				<div className="flex flex-none items-center justify-between border-b border-slate-100 pb-3">
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-base font-black text-slate-900">
								{isEditMode ? "Manage Store Dispatch" : "Dispatch Store Survey"}
							</h2>
							
						</div>
						<p className="mt-0.5 text-xs text-slate-500">
							Select survey track, products, and allocate ranges to auditors
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="cursor-pointer p-1 text-slate-400 transition hover:text-slate-600"
					>
						✕
					</button>
				</div>

				<form
					onSubmit={handleSubmit}
					className="flex-1 space-y-4 overflow-y-auto pr-1 text-xs"
				>
					{/* 1. Cycle & Store Selection (Custom Collapsible Cycle Selector) */}
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="relative" ref={dropdownRef}>
							<label className="mb-1 block font-bold text-slate-700">
								Survey Cycle (Click to expand daily streams)
							</label>

							<button
								type="button"
								onClick={() => setIsCycleDropdownOpen(!isCycleDropdownOpen)}
								className="w-full flex items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] cursor-pointer text-left shadow-2xs"
							>
								<span className="truncate">
									{selectedCycleObj?.name || "Select a survey cycle..."}
								</span>
								<span className="text-slate-400 text-xs ml-1 flex-none">
									{isCycleDropdownOpen ? "▲" : "▼"}
								</span>
							</button>

							{/* Dropdown with Accordion Daily Streams */}
							{isCycleDropdownOpen && (
								<div className="absolute left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-30 space-y-1">
									{weeklyPeriods.length === 0 ? (
										<p className="p-2 text-center text-slate-400">
											No open cycles available
										</p>
									) : (
										weeklyPeriods.map((wp) => {
											const dailyList = dailyByWeekly[wp.id] || [];
											const isExpanded = Boolean(expandedWeeklyCycles[wp.id]);
											const isWeeklySelected = surveyPeriodId === wp.id;

											return (
												<div
													key={wp.id}
													className="rounded-lg border border-slate-100 bg-slate-50/50 overflow-hidden"
												>
													<div className="flex items-center justify-between p-2 hover:bg-slate-100/80 transition">
														{/* Extending Arrow Button */}
														{dailyList.length > 0 && (
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	setExpandedWeeklyCycles((prev) => ({
																		...prev,
																		[wp.id]: !prev[wp.id],
																	}));
																}}
																className="mr-2 flex h-5 w-5 items-center justify-center rounded bg-slate-200/70 text-slate-600 hover:bg-slate-300 text-[10px] font-bold cursor-pointer transition flex-none"
																title={
																	isExpanded
																		? "Collapse daily cycles"
																		: "Expand 7 daily cycles"
																}
															>
																{isExpanded ? "▼" : "▶"}
															</button>
														)}

														<div
															onClick={() => {
																setSurveyPeriodId(wp.id);
																setActiveProductTab("WEEKLY");
																setIsCycleDropdownOpen(false);
															}}
															className="flex-1 cursor-pointer min-w-0"
														>
															<span
																className={`text-xs font-bold block truncate ${isWeeklySelected ? "text-[#A41821]" : "text-slate-800"}`}
															>
																{isWeeklySelected ? "✓ " : ""}
																{wp.name}
															</span>
															{dailyList.length > 0 && (
																<span className="text-[10px] text-emerald-700 font-semibold">
																	({dailyList.length} daily streams)
																</span>
															)}
														</div>
													</div>

													{/* Collapsible Daily Cycles */}
													{isExpanded && dailyList.length > 0 && (
														<div className="border-t border-slate-200 bg-white py-1 pl-6 pr-2 space-y-1 animate-in fade-in">
															{dailyList.map((dp) => {
																const isDailySelected =
																	surveyPeriodId === dp.id;

																return (
																	<button
																		key={dp.id}
																		type="button"
																		onClick={() => {
																			setSurveyPeriodId(dp.id);
																			setActiveProductTab("DAILY");
																			setIsCycleDropdownOpen(false);
																		}}
																		className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md text-left text-[11px] transition cursor-pointer ${
																			isDailySelected
																				? "bg-emerald-50 text-[#017C4D] font-bold"
																				: "text-slate-600 hover:bg-slate-50"
																		}`}
																	>
																		<span className="truncate">
																			↳ {dp.name}
																		</span>
																		<span className="text-[9px] font-mono text-slate-400">
																			Daily
																		</span>
																	</button>
																);
															})}
														</div>
													)}
												</div>
											);
										})
									)}
								</div>
							)}
						</div>

						{/* Store Selector */}
						<div>
							<label className="mb-1 block font-bold text-slate-700">
								Target Store Location
							</label>
							<select
								value={storeId}
								onChange={(e) => setStoreId(e.target.value)}
								disabled={storesLoading || isLoadingExisting}
								className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-hidden focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
							>
								{stores.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name} ({s.type})
									</option>
								))}
							</select>
						</div>
					</div>

					{selectedStore && (
						<p className="font-mono text-[11px] text-slate-400">
							GPS Anchor: Lat {Number(selectedStore.latitude).toFixed(5)}, Lon{" "}
							{Number(selectedStore.longitude).toFixed(5)}
						</p>
					)}

					{/* 2. SELECT SURVEY TRACK & PRODUCTS (Matches ProductsPage.jsx: 20 / 100 / 500 / 2804) */}
					<div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								SELECT SURVEY TRACK &amp; PRODUCTS
							</span>

							<button
								type="button"
								onClick={handleSelectAllGlobal}
								className="cursor-pointer text-[11px] font-bold text-[#017C4D] hover:underline self-end sm:self-auto"
							>
								{selectedProductIds.length === products.length
									? `Deselect All (${products.length})`
									: `Select All ${products.length} Products`}
							</button>
						</div>

						{/* Survey Track Navigation Tabs */}
						{/* AFTER (Hides horizontal scrollbar completely while staying touch/wheel scrollable) */}
						<div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 no-scrollbar">
							<button
								type="button"
								onClick={() => setActiveProductTab("ALL")}
								className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
									activeProductTab === "ALL"
										? "bg-white text-slate-900 shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								All ({selectedProductIds.length}/{products.length})
							</button>

							<button
								type="button"
								onClick={() => setActiveProductTab("DAILY")}
								className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
									activeProductTab === "DAILY"
										? "bg-[#017C4D] text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Daily Fresh ({selectedDailyCount}/{dailyFreshProducts.length})
							</button>

							<button
								type="button"
								onClick={() => setActiveProductTab("WEEKLY")}
								className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
									activeProductTab === "WEEKLY"
										? "bg-[#A41821] text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Weekly Ultra ({selectedWeeklyCount}/{weeklyProducts.length})
							</button>

							<button
								type="button"
								onClick={() => setActiveProductTab("MONTHLY")}
								className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
									activeProductTab === "MONTHLY"
										? "bg-[#FE7914] text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Monthly ({selectedMonthlyCount}/{monthlyProducts.length})
							</button>

							<button
								type="button"
								onClick={() => setActiveProductTab("BI_YEARLY")}
								className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
									activeProductTab === "BI_YEARLY"
										? "bg-slate-800 text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Bi-Yearly ({selectedBiYearlyCount}/{biYearlyProducts.length})
							</button>
						</div>

						{/* Track Bulk Action & Search */}
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
							{activeProductTab === "DAILY" && (
								<button
									type="button"
									onClick={() =>
										handleToggleCategory(dailyFreshProducts, "Daily Fresh")
									}
									className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
										selectedDailyCount > 0
											? "border-red-200 bg-red-50 text-[#A41821] hover:bg-red-100"
											: "border-emerald-200 bg-emerald-50 text-[#017C4D] hover:bg-emerald-100"
									}`}
								>
									{selectedDailyCount > 0
										? `✕ Deselect Entire Track (${selectedDailyCount})`
										: `✓ Select All Daily Fresh (${dailyFreshProducts.length})`}
								</button>
							)}

							{activeProductTab === "WEEKLY" && (
								<button
									type="button"
									onClick={() =>
										handleToggleCategory(weeklyProducts, "Weekly Ultra")
									}
									className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
										selectedWeeklyCount > 0
											? "border-red-200 bg-red-50 text-[#A41821] hover:bg-red-100"
											: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
									}`}
								>
									{selectedWeeklyCount > 0
										? `✕ Deselect Entire Track (${selectedWeeklyCount})`
										: `✓ Select All Weekly Ultra (${weeklyProducts.length})`}
								</button>
							)}

							{activeProductTab === "MONTHLY" && (
								<button
									type="button"
									onClick={() =>
										handleToggleCategory(monthlyProducts, "Monthly")
									}
									className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
										selectedMonthlyCount > 0
											? "border-red-200 bg-red-50 text-[#A41821] hover:bg-red-100"
											: "border-amber-200 bg-amber-50 text-[#FE7914] hover:bg-amber-100"
									}`}
								>
									{selectedMonthlyCount > 0
										? `✕ Deselect Entire Track (${selectedMonthlyCount})`
										: `✓ Select All Monthly (${monthlyProducts.length})`}
								</button>
							)}

							{activeProductTab === "BI_YEARLY" && (
								<button
									type="button"
									onClick={() =>
										handleToggleCategory(biYearlyProducts, "Bi-Yearly")
									}
									className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
										selectedBiYearlyCount > 0
											? "border-red-200 bg-red-50 text-[#A41821] hover:bg-red-100"
											: "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
									}`}
								>
									{selectedBiYearlyCount > 0
										? `✕ Deselect Entire Track (${selectedBiYearlyCount})`
										: `✓ Select All Bi-Yearly (${biYearlyProducts.length})`}
								</button>
							)}

							{activeProductTab === "ALL" && (
								<span className="text-[11px] font-semibold text-slate-500">
									Showing {products.length} products
								</span>
							)}

							<div className="relative w-full sm:w-48">
								<input
									type="text"
									value={checklistSearch}
									onChange={(e) => setChecklistSearch(e.target.value)}
									placeholder="Search items..."
									className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#A41821] outline-hidden"
								/>
								{checklistSearch && (
									<button
										type="button"
										onClick={() => setChecklistSearch("")}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
									>
										✕
									</button>
								)}
							</div>
						</div>

						{/* Checklist Scroll Container */}
						<div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
							{productsLoading ? (
								<p className="py-4 text-center text-xs text-slate-400">
									Loading catalog...
								</p>
							) : displayedChecklist.length === 0 ? (
								<p className="py-4 text-center text-xs text-slate-400">
									No products match filter.
								</p>
							) : (
								displayedChecklist.map((p, idx) => {
									const isChecked = selectedProductIds.includes(p.id);

									const trackBadge = {
										DAILY: {
											label: "DAILY FRESH",
											bg: "bg-emerald-50 text-[#017C4D] border-emerald-100",
										},
										WEEKLY: {
											label: "WEEKLY",
											bg: "bg-red-50 text-[#A41821] border-red-100",
										},
										MONTHLY: {
											label: "MONTHLY",
											bg: "bg-amber-50 text-[#FE7914] border-amber-100",
										},
										BI_YEARLY: {
											label: "BI-YEARLY",
											bg: "bg-slate-100 text-slate-700 border-slate-200",
										},
									}[p.frequency] || {
										label: "BI-YEARLY",
										bg: "bg-slate-100 text-slate-700 border-slate-200",
									};

									return (
										<label
											key={p.id}
											className={`flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs transition border ${
												isChecked
													? "bg-white border-slate-200 shadow-2xs font-semibold text-slate-900"
													: "bg-white/40 border-transparent text-slate-400 hover:bg-white"
											}`}
										>
											<div className="flex min-w-0 items-center gap-2.5 pr-2">
												<input
													type="checkbox"
													checked={isChecked}
													onChange={() => handleToggleProduct(p.id)}
													className="cursor-pointer rounded border-slate-300 text-[#A41821] focus:ring-[#A41821]"
												/>
												<span className="font-mono text-[10px] text-slate-400">
													#{idx + 1}
												</span>
												<span className="truncate">
													{formatProductName(p.name)} ({p.unit})
												</span>
											</div>
											<div className="flex items-center gap-2 flex-none">
												<span
													className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider border ${trackBadge.bg}`}
												>
													{trackBadge.label}
												</span>
												<span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
													{p.barcode || p.sku || p.id}
												</span>
											</div>
										</label>
									);
								})
							)}
						</div>
					</div>

					{/* 3. AUDITOR ALLOCATIONS SECTION */}
					<div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
						<div className="flex items-center justify-between gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
								Auditors on Duty ({allocations.length} Selected)
							</span>

							{allocations.length > 1 && selectedProductIds.length > 0 && (
								<button
									type="button"
									onClick={handleRebalanceEqually}
									className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-bold text-[#017C4D] shadow-2xs transition-all duration-150 hover:border-[#017C4D] hover:bg-[#017C4D] hover:text-white active:scale-95"
								>
									Re-balance ({selectedProductIds.length} Items)
								</button>
							)}
						</div>

						{/* Auditor Selection Chips */}
						<div className="flex flex-wrap gap-1.5 pt-1">
							{auditors.map((a) => {
								const isSelected = allocations.some(
									(alloc) => alloc.auditorId === a.id,
								);
								return (
									<button
										key={a.id}
										type="button"
										onClick={() => handleToggleAuditor(a.id)}
										className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
											isSelected
												? "border-[#A41821] bg-[#A41821] text-white shadow-2xs"
												: "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
										}`}
									>
										{isSelected ? "✓ " : "+ "}
										{a.name}
									</button>
								);
							})}
						</div>

						{/* Range per Auditor */}
						<div className="space-y-1.5 pt-1">
							{allocations.map((alloc) => {
								const auditorObj = auditors.find(
									(a) => a.id === alloc.auditorId,
								);

								return (
									<div
										key={alloc.auditorId}
										className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs"
									>
										<div className="min-w-0 flex-1">
											<span className="truncate text-xs font-bold text-slate-900 block">
												{auditorObj?.name || "Auditor"}
											</span>
										</div>

										<div className="flex items-center gap-1.5 flex-none">
											<span className="text-[10px] text-slate-500">Item #</span>
											<input
												type="number"
												min="0"
												max={selectedProductIds.length || 1}
												value={alloc.fromNumber}
												onChange={(e) =>
													handleRangeChange(
														alloc.auditorId,
														"fromNumber",
														e.target.value,
													)
												}
												className="w-12 rounded border border-slate-300 bg-slate-50 px-1 py-0.5 font-mono text-center text-xs font-bold text-slate-800"
											/>
											<span className="text-[10px] text-slate-500">to #</span>
											<input
												type="number"
												min="0"
												max={selectedProductIds.length || 1}
												value={alloc.toNumber}
												onChange={(e) =>
													handleRangeChange(
														alloc.auditorId,
														"toNumber",
														e.target.value,
													)
												}
												className="w-12 rounded border border-slate-300 bg-slate-50 px-1 py-0.5 font-mono text-center text-xs font-bold text-slate-800"
											/>
											<span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
												{alloc.count} items
											</span>
											<button
												type="button"
												onClick={() => handleToggleAuditor(alloc.auditorId)}
												className="text-slate-400 hover:text-[#A41821] p-1 text-xs cursor-pointer"
												title="Remove auditor"
											>
												✕
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Action Footer */}
					<div className="flex flex-none justify-end gap-2 border-t border-slate-100 pt-3">
						<button
							type="button"
							onClick={onClose}
							className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={
								createBatch.isPending ||
								updateAllocations.isPending ||
								allocations.length === 0 ||
								selectedProductIds.length === 0 ||
								!openPeriods.length
							}
							className="cursor-pointer rounded-xl bg-[#A41821] px-5 py-2 font-bold text-white shadow-xs transition hover:bg-[#7F1219] active:scale-95 disabled:opacity-50"
						>
							{createBatch.isPending || updateAllocations.isPending
								? "Processing Dispatch..."
								: isEditMode
									? "Save Store Dispatch"
									: `Dispatch ${selectedProductIds.length} Items to ${allocations.length} Auditors`}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
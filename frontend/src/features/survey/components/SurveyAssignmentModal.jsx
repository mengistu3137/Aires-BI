import React, { useState, useEffect, useMemo, useCallback } from "react";
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
 * Computes equal slices across total items for N auditors
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
			fromNumber: start + 1,
			toNumber: end,
			count: len,
			startIndex: start,
			endIndex: end,
		});
		currentStart = end;
	}
	return slices;
};

/**
 * Synchronizes allocation ranges and item counts with the active product pool
 */
const syncAllocationsWithCount = (currentAllocations, activeCount) => {
	if (!currentAllocations || currentAllocations.length === 0) return [];
	if (activeCount <= 0) {
		return currentAllocations.map((a) => ({
			...a,
			fromNumber: 0,
			toNumber: 0,
			count: 0,
		}));
	}

	const slices = calculateEqualSlices(activeCount, currentAllocations.length);
	return currentAllocations.map((item, idx) => ({
		...item,
		fromNumber: slices[idx]?.fromNumber || 1,
		toNumber: slices[idx]?.toNumber || activeCount,
		count: slices[idx]?.count || activeCount,
	}));
};

/**
 * Robust track resolution matching the imported database frequency
 */
const getProductTrack = (p) => {
	const freq = String(p.frequency || "").toUpperCase();
	if (
		freq === "DAILY" ||
		freq === "WEEKLY" ||
		freq === "MONTHLY" ||
		freq === "BI_YEARLY"
	) {
		return freq;
	}

	const cat = String(p.category || "").toLowerCase();
	if (cat.includes("fresh")) return "DAILY";
	if (cat.includes("ultra")) return "WEEKLY";
	if (cat.includes("sensitive") && !cat.includes("non")) return "MONTHLY";
	return "BI_YEARLY";
};

export const SurveyAssignmentModal = ({
	isOpen,
	onClose,
	storeId: initialStoreId = null,
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

	const auditors = useMemo(
		() =>
			(users || []).filter(
				(u) => u.role === "FIELD_AUDITOR" && u.active !== false,
			),
		[users],
	);

	const [surveyPeriodId, setSurveyPeriodId] = useState("");
	const [storeId, setStoreId] = useState("");

	// Product selection pool
	const [selectedProductIds, setSelectedProductIds] = useState([]);

	// Product Checklist Tab: 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'BI_YEARLY'
	const [activeProductTab, setActiveProductTab] = useState("WEEKLY");
	const [checklistSearch, setChecklistSearch] = useState("");

	// Multi-Auditor Allocation State
	const [allocations, setAllocations] = useState([]);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isLoadingExisting, setIsLoadingExisting] = useState(false);

	// 4 Track Pools
	const dailyFreshProducts = useMemo(
		() => products.filter((p) => getProductTrack(p) === "DAILY"),
		[products],
	);

	const weeklyUltraProducts = useMemo(
		() => products.filter((p) => getProductTrack(p) === "WEEKLY"),
		[products],
	);

	const monthlySensitiveProducts = useMemo(
		() => products.filter((p) => getProductTrack(p) === "MONTHLY"),
		[products],
	);

	const biYearlyProducts = useMemo(
		() => products.filter((p) => getProductTrack(p) === "BI_YEARLY"),
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
			weeklyUltraProducts.filter((p) => selectedProductIds.includes(p.id))
				.length,
		[weeklyUltraProducts, selectedProductIds],
	);

	const selectedMonthlyCount = useMemo(
		() =>
			monthlySensitiveProducts.filter((p) => selectedProductIds.includes(p.id))
				.length,
		[monthlySensitiveProducts, selectedProductIds],
	);

	const selectedBiYearlyCount = useMemo(
		() =>
			biYearlyProducts.filter((p) => selectedProductIds.includes(p.id)).length,
		[biYearlyProducts, selectedProductIds],
	);

	// Initialize store and survey period on open
	useEffect(() => {
		if (!isOpen) return;
		setSurveyPeriodId(activePeriod?.id || openPeriods[0]?.id || "");
		setStoreId(initialStoreId || stores[0]?.id || "");
	}, [isOpen, activePeriod, openPeriods, initialStoreId, stores]);

	// Pre-select weekly ultra-sensitive products by default for standard weekly cycles
	useEffect(() => {
		if (!isOpen || isEditMode) return;
		if (products.length > 0 && selectedProductIds.length === 0) {
			const defaults =
				weeklyUltraProducts.length > 0
					? weeklyUltraProducts.map((p) => p.id)
					: products.map((p) => p.id);
			setSelectedProductIds(defaults);
			setAllocations((prev) => syncAllocationsWithCount(prev, defaults.length));
		}
	}, [
		isOpen,
		products,
		isEditMode,
		weeklyUltraProducts,
		selectedProductIds.length,
	]);

	// Load existing allocations or preserve configured auditor on store change
	useEffect(() => {
		if (!isOpen || !storeId || !surveyPeriodId) return;

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

					if (allAssignedIds.length > 0) {
						setSelectedProductIds(allAssignedIds);
					}

					// Map relative sequential ranges (1 to count) rather than catalog indices
					let currentStart = 1;
					const mapped = existing.map((asn) => {
						const count = asn.productIds?.length || 0;
						const fromNumber = currentStart;
						const toNumber = Math.max(fromNumber, currentStart + count - 1);
						currentStart = toNumber + 1;

						return {
							auditorId: asn.auditorId,
							fromNumber: count > 0 ? fromNumber : 1,
							toNumber: count > 0 ? toNumber : 1,
							count,
							observedCount: asn.observedCount || 0,
							assignmentId: asn.assignmentId,
							status: asn.status || "NOT_STARTED",
						};
					});
					setAllocations(mapped);
				} else {
					setIsEditMode(false);
					setAllocations((prevAllocations) => {
						const activeAuditorList =
							prevAllocations.length > 0
								? prevAllocations
								: auditors.slice(0, Math.min(1, auditors.length)).map((a) => ({
										auditorId: a.id,
										observedCount: 0,
										status: "NOT_STARTED",
									}));

						const activeCount = selectedProductIds.length || products.length;
						return syncAllocationsWithCount(activeAuditorList, activeCount);
					});
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
	}, [isOpen, storeId, surveyPeriodId]);

	// Product selection handlers with immediate auditor range synchronization
	const handleToggleProduct = useCallback((productId) => {
		setSelectedProductIds((prev) => {
			const next = prev.includes(productId)
				? prev.filter((id) => id !== productId)
				: [...prev, productId];
			setAllocations((prevAlloc) =>
				syncAllocationsWithCount(prevAlloc, next.length),
			);
			return next;
		});
	}, []);

	const handleSelectAllGlobal = useCallback(() => {
		setSelectedProductIds((prev) => {
			const next =
				prev.length === products.length ? [] : products.map((p) => p.id);
			setAllocations((prevAlloc) =>
				syncAllocationsWithCount(prevAlloc, next.length),
			);
			return next;
		});
	}, [products]);

	const handleToggleCategory = useCallback(
		(trackProducts) => {
			const trackIds = trackProducts.map((p) => p.id);
			const allSelected = trackIds.every((id) =>
				selectedProductIds.includes(id),
			);

			let next;
			if (allSelected) {
				next = selectedProductIds.filter((id) => !trackIds.includes(id));
				toast.success(`Deselected ${trackIds.length} items`);
			} else {
				next = Array.from(new Set([...selectedProductIds, ...trackIds]));
				toast.success(`Selected all ${trackIds.length} items`);
			}

			setSelectedProductIds(next);
			setAllocations((prevAlloc) =>
				syncAllocationsWithCount(prevAlloc, next.length),
			);
		},
		[selectedProductIds],
	);

	const handleRebalanceEqually = useCallback(() => {
		if (allocations.length === 0 || selectedProductIds.length === 0) return;
		setAllocations((prev) =>
			syncAllocationsWithCount(prev, selectedProductIds.length),
		);
		toast.success("Re-balanced ranges across active selected items");
	}, [allocations.length, selectedProductIds.length]);

	const handleToggleAuditor = useCallback(
		(auditorIdToToggle) => {
			const exists = allocations.find((a) => a.auditorId === auditorIdToToggle);
			let updated;

			if (exists) {
				updated = allocations.filter((a) => a.auditorId !== auditorIdToToggle);
			} else {
				updated = [
					...allocations,
					{
						auditorId: auditorIdToToggle,
						fromNumber: 1,
						toNumber: selectedProductIds.length,
						count: selectedProductIds.length,
						observedCount: 0,
						status: "NOT_STARTED",
					},
				];
			}

			setAllocations(
				syncAllocationsWithCount(updated, selectedProductIds.length),
			);
		},
		[allocations, selectedProductIds.length],
	);

	const handleRangeChange = useCallback((auditorIdToEdit, field, val) => {
		const parsed = parseInt(val, 10) || 0;
		setAllocations((prev) =>
			prev.map((a) => {
				if (a.auditorId !== auditorIdToEdit) return a;
				const from = field === "fromNumber" ? parsed : a.fromNumber;
				const to = field === "toNumber" ? parsed : a.toNumber;
				return {
					...a,
					[field]: parsed,
					count: Math.max(0, to - from + 1),
				};
			}),
		);
	}, []);

	// Active Tab items
	const currentTabPool = useMemo(() => {
		switch (activeProductTab) {
			case "DAILY":
				return dailyFreshProducts;
			case "WEEKLY":
				return weeklyUltraProducts;
			case "MONTHLY":
				return monthlySensitiveProducts;
			case "BI_YEARLY":
				return biYearlyProducts;
			default:
				return products;
		}
	}, [
		activeProductTab,
		dailyFreshProducts,
		weeklyUltraProducts,
		monthlySensitiveProducts,
		biYearlyProducts,
		products,
	]);

	// Filtered products list for checklist render
	const displayedChecklist = useMemo(() => {
		if (!checklistSearch.trim()) return currentTabPool;
		const term = checklistSearch.toLowerCase().trim();
		return currentTabPool.filter(
			(p) =>
				p.name?.toLowerCase().includes(term) ||
				p.sku?.toLowerCase().includes(term) ||
				p.barcode?.toLowerCase().includes(term),
		);
	}, [currentTabPool, checklistSearch]);

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
			// Single auditor automatically gets the entire active pool
			if (allocations.length === 1) {
				return {
					auditorId: alloc.auditorId,
					productIds: activeProductsPool.map((p) => p.id),
				};
			}

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
		};

		try {
			if (isEditMode) {
				await updateAllocations.mutateAsync(payload);
			} else {
				await createBatch.mutateAsync(payload);
			}
			onClose();
		} catch {
			// Error toasts handled by mutation hooks
		}
	};

	if (!isOpen) return null;

	const selectedStore = stores.find((s) => s.id === storeId);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
			<div className="flex max-h-[92vh] w-full max-w-2xl flex-col space-y-4 rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-2xl">
				{/* Header */}
				<div className="flex flex-none items-center justify-between border-b border-slate-100 pb-3">
					<div>
						<div className="flex items-center gap-2">
							<h2 className="text-base font-black text-slate-900">
								{isEditMode ? "Manage Store Dispatch" : "Dispatch Store Survey"}
							</h2>
							<span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-bold text-[#017C4D]">
								{selectedProductIds.length}/{products.length} Products Active
							</span>
						</div>
						<p className="mt-0.5 text-xs text-slate-500">
							Select tracking tracks, allocate ranges, and assign field auditors
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
					{/* 1. Cycle & Store Selection */}
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<label className="mb-1 block font-bold text-slate-700">
								Survey Cycle
							</label>
							<select
								value={surveyPeriodId}
								onChange={(e) => setSurveyPeriodId(e.target.value)}
								className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-800 outline-hidden focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] cursor-pointer"
							>
								{openPeriods.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name} (OPEN)
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="mb-1 block font-bold text-slate-700">
								Target Store
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
							GPS anchor: Lat {Number(selectedStore.latitude).toFixed(5)}, Lon{" "}
							{Number(selectedStore.longitude).toFixed(5)}
						</p>
					)}

					{/* 2. 4-Track Product Selection Tabs */}
					<div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
								Select Survey Track &amp; Products
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

						{/* 4 Tracks Navigation Tabs with Brand Tokens */}
						<div className="grid grid-cols-2 sm:grid-cols-5 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
							<button
								type="button"
								onClick={() => setActiveProductTab("ALL")}
								className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition cursor-pointer text-center ${
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
								className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition cursor-pointer text-center ${
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
								className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition cursor-pointer text-center ${
									activeProductTab === "WEEKLY"
										? "bg-[#A41821] text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Weekly Ultra ({selectedWeeklyCount}/{weeklyUltraProducts.length}
								)
							</button>

							<button
								type="button"
								onClick={() => setActiveProductTab("MONTHLY")}
								className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition cursor-pointer text-center ${
									activeProductTab === "MONTHLY"
										? "bg-[#FE7914] text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Monthly ({selectedMonthlyCount}/
								{monthlySensitiveProducts.length})
							</button>

							<button
								type="button"
								onClick={() => setActiveProductTab("BI_YEARLY")}
								className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition cursor-pointer text-center col-span-2 sm:col-span-1 ${
									activeProductTab === "BI_YEARLY"
										? "bg-slate-800 text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Bi-Yearly ({selectedBiYearlyCount}/{biYearlyProducts.length})
							</button>
						</div>

						{/* Track Toolbar: Quick Select / Deselect */}
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
							{activeProductTab !== "ALL" ? (
								<button
									type="button"
									onClick={() => handleToggleCategory(currentTabPool)}
									className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
								>
									{currentTabPool.length > 0 &&
									currentTabPool.every((p) => selectedProductIds.includes(p.id))
										? `✕ Deselect Entire Track (${currentTabPool.length})`
										: `✓ Select Entire Track (${currentTabPool.length})`}
								</button>
							) : (
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
						<div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
							{productsLoading ? (
								<p className="py-4 text-center text-xs text-slate-400">
									Loading catalog...
								</p>
							) : displayedChecklist.length === 0 ? (
								<p className="py-4 text-center text-xs text-slate-400">
									No products match this track or filter.
								</p>
							) : (
								displayedChecklist.map((p, idx) => {
									const isChecked = selectedProductIds.includes(p.id);
									const track = getProductTrack(p);

									const badgeStyles = {
										DAILY: "bg-emerald-50 text-[#017C4D] border-emerald-200",
										WEEKLY: "bg-red-50 text-[#A41821] border-red-200",
										MONTHLY: "bg-orange-50 text-[#D45F06] border-orange-200",
										BI_YEARLY: "bg-slate-100 text-slate-700 border-slate-300",
									}[track];

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
													className={`rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${badgeStyles}`}
												>
													{track.replace("_", "-")}
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

					{/* 3. Auditor Allocations Section */}
					<div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
						<div className="flex items-center justify-between gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
								Auditors on Duty ({allocations.length} Selected)
							</span>

							{allocations.length > 1 && (
								<button
									type="button"
									onClick={handleRebalanceEqually}
									className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-bold text-[#017C4D] shadow-2xs transition-all duration-150 hover:border-[#017C4D] hover:bg-[#017C4D] hover:text-white active:scale-95"
									title={`Distribute ${selectedProductIds.length} items equally across ${allocations.length} auditors`}
								>
									<span>Re-balance ({selectedProductIds.length} Items)</span>
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
												min="1"
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
												min="1"
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
									? `Save Store Dispatch (${selectedProductIds.length} Items)`
									: `Dispatch ${selectedProductIds.length} Items to ${allocations.length} Auditor${allocations.length > 1 ? "s" : ""}`}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
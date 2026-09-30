import React, { useState, useEffect, useMemo } from "react";
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
	if (totalItems === 0 || count <= 0) return [];
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

export const SurveyAssignmentModal = ({
	isOpen,
	onClose,
	storeId: initialStoreId = null,
}) => {
	const { stores, isLoading: storesLoading } = useStores();
	const { users } = useUsers();
	const { products, isLoading: productsLoading } = useProducts();
	const { activePeriod, periods } = usePeriods();

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

	// All 120 products pre-selected by default
	const [selectedProductIds, setSelectedProductIds] = useState([]);

	// Product Checklist UI State
	const [activeProductTab, setActiveProductTab] = useState("ALL"); // 'ALL' | 'ULTRA_SENSITIVE' | 'FRESH_CORNER'
	const [checklistSearch, setChecklistSearch] = useState("");

	// Multi-Auditor Slicing State
	const [allocations, setAllocations] = useState([]);
	const [isEditMode, setIsEditMode] = useState(false);
	const [isLoadingExisting, setIsLoadingExisting] = useState(false);

	// Split Category Pools
	const ultraSensitiveProducts = useMemo(
		() => products.filter((p) => p.category?.toLowerCase().includes("ultra")),
		[products],
	);

	const freshCornerProducts = useMemo(
		() => products.filter((p) => !p.category?.toLowerCase().includes("ultra")),
		[products],
	);

	// Active Category Product Counts
	const selectedUltraCount = useMemo(
		() =>
			ultraSensitiveProducts.filter((p) => selectedProductIds.includes(p.id))
				.length,
		[ultraSensitiveProducts, selectedProductIds],
	);

	const selectedFreshCount = useMemo(
		() =>
			freshCornerProducts.filter((p) => selectedProductIds.includes(p.id))
				.length,
		[freshCornerProducts, selectedProductIds],
	);

	// Initialize store and survey period
	useEffect(() => {
		if (!isOpen) return;
		setSurveyPeriodId(activePeriod?.id || openPeriods[0]?.id || "");
		setStoreId(initialStoreId || stores[0]?.id || "");
	}, [isOpen, activePeriod, openPeriods, initialStoreId, stores]);

	// Pre-select all 120 products by default on open (if not in edit mode)
	useEffect(() => {
		if (!isOpen || isEditMode) return;
		if (products.length > 0 && selectedProductIds.length === 0) {
			setSelectedProductIds(products.map((p) => p.id));
		}
	}, [isOpen, products, isEditMode, selectedProductIds.length]);

	// Check for existing active store allocations when store or period changes
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
					// Extract currently assigned products across existing allocations
					const allAssignedIds = Array.from(
						new Set(existing.flatMap((asn) => asn.productIds || [])),
					);
					if (allAssignedIds.length > 0) {
						setSelectedProductIds(allAssignedIds);
					}

					const mapped = existing.map((asn) => {
						const firstIdx = products.findIndex(
							(p) => p.id === asn.productIds[0],
						);
						const lastIdx = products.findIndex(
							(p) => p.id === asn.productIds[asn.productIds.length - 1],
						);

						return {
							auditorId: asn.auditorId,
							fromNumber: firstIdx !== -1 ? firstIdx + 1 : 1,
							toNumber: lastIdx !== -1 ? lastIdx + 1 : asn.productIds.length,
							count: asn.productIds.length,
							observedCount: asn.observedCount,
							canModify: asn.canModify,
							assignmentId: asn.assignmentId,
						};
					});
					setAllocations(mapped);
				} else {
					setIsEditMode(false);
					if (products.length > 0) {
						setSelectedProductIds(products.map((p) => p.id));
					}
					const defaultCount = Math.min(3, auditors.length);
					const initialAuditorIds = auditors
						.slice(0, defaultCount)
						.map((a) => a.id);
					const slices = calculateEqualSlices(products.length, defaultCount);

					const defaultAllocations = initialAuditorIds.map((id, idx) => ({
						auditorId: id,
						fromNumber: slices[idx]?.fromNumber || 1,
						toNumber: slices[idx]?.toNumber || products.length,
						count: slices[idx]?.count || products.length,
						observedCount: 0,
						canModify: true,
					}));

					setAllocations(defaultAllocations);
				}
			})
			.catch(() => {
				setIsEditMode(false);
			})
			.finally(() => {
				if (isMounted) setIsLoadingExisting(false);
			});

		return () => {
			isMounted = false;
		};
	}, [isOpen, storeId, surveyPeriodId, auditors, products]);

	// Product Selection Handlers
	const handleToggleProduct = (productId) => {
		setSelectedProductIds((prev) =>
			prev.includes(productId)
				? prev.filter((id) => id !== productId)
				: [...prev, productId],
		);
	};

	const handleSelectAllGlobal = () => {
		if (selectedProductIds.length === products.length) {
			setSelectedProductIds([]);
		} else {
			setSelectedProductIds(products.map((p) => p.id));
		}
	};

	// Bulk Category Toggle
	const handleToggleCategory = (categoryProducts) => {
		const catIds = categoryProducts.map((p) => p.id);
		const allSelected = catIds.every((id) => selectedProductIds.includes(id));

		if (allSelected) {
			// Bulk Deselect this category
			setSelectedProductIds((prev) =>
				prev.filter((id) => !catIds.includes(id)),
			);
			toast.success(`Deselected ${catIds.length} items`);
		} else {
			// Bulk Select all in this category
			setSelectedProductIds((prev) =>
				Array.from(new Set([...prev, ...catIds])),
			);
			toast.success(`Selected all ${catIds.length} items`);
		}
	};

	// Rebalance ranges equally across selected auditors using the ACTIVE selected products pool
	const handleRebalanceEqually = () => {
		if (allocations.length === 0 || selectedProductIds.length === 0) return;
		const slices = calculateEqualSlices(
			selectedProductIds.length,
			allocations.length,
		);

		setAllocations((prev) =>
			prev.map((item, idx) => {
				if (!item.canModify) return item;
				return {
					...item,
					fromNumber: slices[idx]?.fromNumber || 1,
					toNumber: slices[idx]?.toNumber || selectedProductIds.length,
					count: slices[idx]?.count || selectedProductIds.length,
				};
			}),
		);
		toast.success("Re-balanced ranges across active selected items");
	};

	const handleToggleAuditor = (auditorIdToToggle) => {
		const exists = allocations.find((a) => a.auditorId === auditorIdToToggle);

		if (exists) {
			if (!exists.canModify) {
				toast.error(
					"Cannot remove this auditor: field observations have already started.",
				);
				return;
			}
			const updated = allocations.filter(
				(a) => a.auditorId !== auditorIdToToggle,
			);
			const slices = calculateEqualSlices(
				selectedProductIds.length,
				updated.length,
			);

			setAllocations(
				updated.map((item, idx) => ({
					...item,
					fromNumber: slices[idx]?.fromNumber || 1,
					toNumber: slices[idx]?.toNumber || selectedProductIds.length,
					count: slices[idx]?.count || selectedProductIds.length,
				})),
			);
		} else {
			const updated = [
				...allocations,
				{
					auditorId: auditorIdToToggle,
					fromNumber: 1,
					toNumber: selectedProductIds.length,
					count: selectedProductIds.length,
					observedCount: 0,
					canModify: true,
				},
			];
			const slices = calculateEqualSlices(
				selectedProductIds.length,
				updated.length,
			);

			setAllocations(
				updated.map((item, idx) => ({
					...item,
					fromNumber: slices[idx]?.fromNumber || 1,
					toNumber: slices[idx]?.toNumber || selectedProductIds.length,
					count: slices[idx]?.count || selectedProductIds.length,
				})),
			);
		}
	};

	const handleRangeChange = (auditorIdToEdit, field, val) => {
		const parsed = parseInt(val, 10);
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
	};

	// Filtered products list for checklist render
	const displayedChecklist = useMemo(() => {
		let list = products;
		if (activeProductTab === "ULTRA_SENSITIVE") {
			list = ultraSensitiveProducts;
		} else if (activeProductTab === "FRESH_CORNER") {
			list = freshCornerProducts;
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
		ultraSensitiveProducts,
		freshCornerProducts,
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

		// Map allocations against the user's active selected products pool
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
		};

		try {
			if (isEditMode) {
				await updateAllocations.mutateAsync(payload);
			} else {
				await createBatch.mutateAsync(payload);
			}
			onClose();
		} catch {
			// Error handled by hook toast
		}
	};

	if (!isOpen) return null;

	const selectedStore = stores.find((s) => s.id === storeId);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
			<div className="flex max-h-[92vh] w-full max-w-xl flex-col space-y-4 rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-2xl">
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
							Filter by category tabs to selectively include or bulk-exclude
							product lines
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
								disabled={Boolean(initialStoreId)}
								className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-800 outline-hidden focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] disabled:bg-slate-100 disabled:cursor-not-allowed"
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
								disabled={Boolean(initialStoreId) || storesLoading}
								className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-hidden focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] disabled:bg-slate-100 disabled:cursor-not-allowed"
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

					{/* 2. CATEGORIZED PRODUCT TABS & SELECTION SECTION */}
					<div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Select Checklist Stream &amp; Products
							</span>

							{/* Global Quick Toggle */}
							<button
								type="button"
								onClick={handleSelectAllGlobal}
								className="cursor-pointer text-[11px] font-bold text-[#017C4D] hover:underline self-end sm:self-auto"
							>
								{selectedProductIds.length === products.length
									? "Deselect All (120)"
									: "Select All 120 Products"}
							</button>
						</div>

						{/* Category Navigation Tabs */}
						<div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1">
							<button
								type="button"
								onClick={() => setActiveProductTab("ALL")}
								className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
									activeProductTab === "ALL"
										? "bg-white text-slate-900 shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								All Products ({selectedProductIds.length}/{products.length})
							</button>

							<button
								type="button"
								onClick={() => setActiveProductTab("ULTRA_SENSITIVE")}
								className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
									activeProductTab === "ULTRA_SENSITIVE"
										? "bg-[#A41821] text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Ultra-Sensitive ({selectedUltraCount}/
								{ultraSensitiveProducts.length})
							</button>

							<button
								type="button"
								onClick={() => setActiveProductTab("FRESH_CORNER")}
								className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
									activeProductTab === "FRESH_CORNER"
										? "bg-[#017C4D] text-white shadow-2xs"
										: "text-slate-600 hover:text-slate-900"
								}`}
							>
								Fresh Corner ({selectedFreshCount}/{freshCornerProducts.length})
							</button>
						</div>

						{/* Tab Toolbar: Category Bulk Action & Inline Search */}
						<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
							{/* Category-Level Bulk Select/Deselect Button */}
							{activeProductTab === "ULTRA_SENSITIVE" && (
								<button
									type="button"
									onClick={() => handleToggleCategory(ultraSensitiveProducts)}
									className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
										selectedUltraCount === ultraSensitiveProducts.length
											? "border-red-200 bg-red-50 text-[#A41821] hover:bg-red-100"
											: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
									}`}
								>
									{selectedUltraCount === ultraSensitiveProducts.length
										? "✕ Deselect All Ultra-Sensitive (100)"
										: `✓ Select All Ultra-Sensitive (${ultraSensitiveProducts.length})`}
								</button>
							)}

							{activeProductTab === "FRESH_CORNER" && (
								<button
									type="button"
									onClick={() => handleToggleCategory(freshCornerProducts)}
									className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition cursor-pointer ${
										selectedFreshCount === freshCornerProducts.length
											? "border-red-200 bg-red-50 text-[#A41821] hover:bg-red-100"
											: "border-emerald-200 bg-emerald-50 text-[#017C4D] hover:bg-emerald-100"
									}`}
								>
									{selectedFreshCount === freshCornerProducts.length
										? "✕ Deselect All Fresh Corner (20)"
										: `✓ Select All Fresh Corner (${freshCornerProducts.length})`}
								</button>
							)}

							{activeProductTab === "ALL" && (
								<span className="text-[11px] font-semibold text-slate-500">
									Showing {products.length} products
								</span>
							)}

							{/* Quick Search */}
							<div className="relative w-full sm:w-48">
								<input
									type="text"
									value={checklistSearch}
									onChange={(e) => setChecklistSearch(e.target.value)}
									placeholder="Filter items..."
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
									const isUltra = p.category?.toLowerCase().includes("ultra");

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
													className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider ${
														isUltra
															? "bg-red-50 text-[#A41821] border border-red-100"
															: "bg-emerald-50 text-[#017C4D] border border-emerald-100"
													}`}
												>
													{isUltra ? "Ultra" : "Fresh"}
												</span>
												<span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
													{p.sku || p.barcode}
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

							{/* Enhanced Brand Micro-Action Button */}
							{allocations.length > 1 && (
								<button
									type="button"
									onClick={handleRebalanceEqually}
									className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200/90 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-bold text-[#017C4D] shadow-2xs transition-all duration-150 hover:border-[#017C4D] hover:bg-[#017C4D] hover:text-white active:scale-95"
									title={`Distribute ${selectedProductIds.length} items equally across ${allocations.length} auditors`}
								>
									<svg
										className="h-3 w-3 shrink-0"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2.5}
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
										/>
									</svg>
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
												disabled={!alloc.canModify}
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
												disabled={!alloc.canModify}
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
											{alloc.canModify && (
												<button
													type="button"
													onClick={() => handleToggleAuditor(alloc.auditorId)}
													className="text-slate-400 hover:text-[#A41821] p-1 text-xs cursor-pointer"
													title="Remove auditor"
												>
													✕
												</button>
											)}
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
import React, { useState, useEffect } from "react";
import { useStores } from "../hooks/useStores.js";
import { useAssignments } from "../hooks/useAssignments.js";
import { usePeriods } from "../hooks/usePeriods.js";
import { useUsers } from "@/features/users/hooks/useUsers.js";
import { useProducts } from "@/features/products/hooks/useProducts.js";
import { formatProductName } from "@/utils/formatters.js";
import toast from "react-hot-toast";

export const SurveyAssignmentModal = ({ isOpen, onClose }) => {
	const { stores, isLoading: storesLoading } = useStores();
	const { users } = useUsers();
	// Fetch live products directly from GET /api/v1/products
	const { products, isLoading: productsLoading } = useProducts();
	const { createAssignment, isCreating } = useAssignments();
	const { activePeriod, periods } = usePeriods();

	const openPeriods = (periods || []).filter((p) => p.status === "OPEN");

	const auditors = (users || []).filter(
		(u) => u.role === "FIELD_AUDITOR" && u.active !== false,
	);

	const [auditorId, setAuditorId] = useState("");
	const [storeId, setStoreId] = useState("");
	const [surveyPeriodId, setSurveyPeriodId] = useState("");
	const [selectedProductIds, setSelectedProductIds] = useState([]);

	useEffect(() => {
		if (activePeriod?.id && !surveyPeriodId) {
			setSurveyPeriodId(activePeriod.id);
		} else if (openPeriods.length > 0 && !surveyPeriodId) {
			setSurveyPeriodId(openPeriods[0].id);
		}
	}, [activePeriod, openPeriods, surveyPeriodId]);

	useEffect(() => {
		if (auditors.length > 0 && !auditorId) setAuditorId(auditors[0].id);
		if (stores.length > 0 && !storeId) setStoreId(stores[0].id);
		if (products.length > 0 && selectedProductIds.length === 0) {
			// Default to selecting all products using their database primary key `p.id`
			setSelectedProductIds(products.map((p) => p.id));
		}
	}, [auditors, stores, products, auditorId, storeId, selectedProductIds]);

	if (!isOpen) return null;

	const handleToggleProduct = (productId) => {
		setSelectedProductIds((prev) =>
			prev.includes(productId)
				? prev.filter((id) => id !== productId)
				: [...prev, productId],
		);
	};

	const handleSelectAll = () => {
		if (selectedProductIds.length === products.length) {
			setSelectedProductIds([]);
		} else {
			setSelectedProductIds(products.map((p) => p.id));
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!auditorId) {
			toast.error("Please select a field auditor");
			return;
		}
		if (!storeId) {
			toast.error("Please select a target store location");
			return;
		}
		if (!surveyPeriodId) {
			toast.error("No open survey cycle found. Please open a cycle first.");
			return;
		}
		if (selectedProductIds.length === 0) {
			toast.error("Please select at least one product to audit");
			return;
		}

		try {
			await createAssignment({
				auditorId,
				storeId,
				surveyPeriodId,
				productIds: selectedProductIds,
				status: "NOT_STARTED",
			});

			toast.success("Assignment dispatched successfully!");
			onClose();
		} catch {
			// Error handled by mutation hook toast
		}
	};

	const selectedStore = stores.find((s) => s.id === storeId);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
			<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-none">
					<div>
						<h2 className="text-base font-black text-slate-900">
							Dispatch Field Survey Assignment
						</h2>
						<p className="text-xs text-slate-500">
							Assign an auditor to a competitor store for an open survey cycle
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1"
					>
						✕
					</button>
				</div>

				<form
					onSubmit={handleSubmit}
					className="space-y-3.5 text-xs flex-1 overflow-y-auto pr-1"
				>
					{/* Active Cycle */}
					<div>
						<label className="block font-bold text-slate-700 mb-1">
							Active Survey Cycle
						</label>
						{openPeriods.length > 0 ? (
							<select
								value={surveyPeriodId}
								onChange={(e) => setSurveyPeriodId(e.target.value)}
								className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden font-mono"
							>
								{openPeriods.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name} (OPEN)
									</option>
								))}
							</select>
						) : (
							<p className="text-xs font-bold text-[#A41821] bg-red-50 p-2.5 rounded-xl border border-red-200">
								⚠️ No survey cycle is currently OPEN. Use "Manage Cycles" to
								launch or reopen a cycle.
							</p>
						)}
					</div>

					{/* Field Auditor */}
					<div>
						<label className="block font-bold text-slate-700 mb-1">
							Assigned Field Auditor
						</label>
						<select
							value={auditorId}
							onChange={(e) => setAuditorId(e.target.value)}
							className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
						>
							{auditors.map((a) => (
								<option key={a.id} value={a.id}>
									{a.name} ({a.phone})
								</option>
							))}
						</select>
					</div>

					{/* Physical Store */}
					<div>
						<label className="block font-bold text-slate-700 mb-1">
							Target Store & Location
						</label>
						<select
							value={storeId}
							onChange={(e) => setStoreId(e.target.value)}
							disabled={storesLoading}
							className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
						>
							{stores.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name} — {s.area || s.city} ({s.type})
								</option>
							))}
						</select>

						{selectedStore && (
							<p className="text-[11px] text-slate-500 mt-1 font-mono">
								GPS Anchor: Lat {selectedStore.latitude || "N/A"}, Lon{" "}
								{selectedStore.longitude || "N/A"}
							</p>
						)}
					</div>

					{/* Products Checklist */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<label className="font-bold text-slate-700">
								Products to Audit ({selectedProductIds.length}/{products.length}
								)
							</label>
							<button
								type="button"
								onClick={handleSelectAll}
								className="text-[11px] font-bold text-[#017C4D] hover:underline cursor-pointer"
							>
								{selectedProductIds.length === products.length
									? "Deselect All"
									: "Select All"}
							</button>
						</div>

						<div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1">
							{productsLoading ? (
								<p className="text-xs text-slate-400 text-center py-2">
									Loading products from database...
								</p>
							) : (
								products.map((p) => {
									const checked = selectedProductIds.includes(p.id);
									return (
										<label
											key={p.id}
											className={`flex items-center justify-between rounded-lg p-2 transition cursor-pointer text-xs ${
												checked
													? "bg-white shadow-2xs font-bold text-slate-900"
													: "text-slate-600 hover:bg-slate-100"
											}`}
										>
											<div className="flex items-center gap-2 min-w-0 pr-2">
												<input
													type="checkbox"
													checked={checked}
													onChange={() => handleToggleProduct(p.id)}
													className="rounded border-slate-300 text-[#A41821] focus:ring-[#A41821] cursor-pointer"
												/>
												<span className="truncate">
													{formatProductName(p.name)} ({p.unit})
												</span>
											</div>
											<span className="text-[10px] text-slate-400 font-mono flex-none">
												{p.barcode || p.sku || p.id}
											</span>
										</label>
									);
								})
							)}
						</div>
					</div>

					{/* Actions */}
					<div className="flex justify-end gap-2 pt-3 border-t border-slate-100 flex-none">
						<button
							type="button"
							onClick={onClose}
							className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isCreating || !openPeriods.length}
							className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
						>
							{isCreating ? "Dispatching..." : "Dispatch Assignment"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
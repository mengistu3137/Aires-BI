import React, { useState } from "react";
import { useSurveyStore } from "@/stores/survey/survey.store.js";
import { PILOT_USERS } from "@/data/pilotData.js";
import toast from "react-hot-toast";

export const SurveyAssignmentModal = ({ isOpen, onClose }) => {
	const { competitors, products, assignments, setAssignments } =
		useSurveyStore();

	const auditors = PILOT_USERS.filter((u) => u.role === "FIELD_AUDITOR");

	const [auditorId, setAuditorId] = useState(auditors[0]?.id || "");
	const [competitorId, setCompetitorId] = useState(competitors[0]?.id || "");
	const [selectedItems, setSelectedItems] = useState(
		products.slice(0, 3).map((p) => p.id),
	);
	const [surveyPeriodId] = useState("2026-W39");

	if (!isOpen) return null;

	const handleToggleItem = (itemId) => {
		setSelectedItems((prev) =>
			prev.includes(itemId)
				? prev.filter((id) => id !== itemId)
				: [...prev, itemId],
		);
	};

	const handleSelectAll = () => {
		if (selectedItems.length === products.length) {
			setSelectedItems([]);
		} else {
			setSelectedItems(products.map((p) => p.id));
		}
	};

	const handleSubmit = (e) => {
		e.preventDefault();

		if (!selectedItems.length) {
			toast.error("Please select at least one product to audit.");
			return;
		}

		const comp = competitors.find((c) => c.id === competitorId);

		const newAssignment = {
			id: `ASN-${Date.now()}`,
			auditorId,
			competitorId,
			marketName: comp?.market || `${comp?.name} Store`,
			surveyPeriodId,
			items: selectedItems,
			status: "NOT_STARTED",
			assignedAt: new Date().toISOString(),
		};

		setAssignments([newAssignment, ...assignments]);
		toast.success(
			`Assigned ${selectedItems.length} products to auditor for ${comp?.name}`,
		);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
			<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
				{/* Modal Header */}
				<div className="flex items-center justify-between border-b border-slate-100 pb-3">
					<div>
						<h2 className="text-base font-bold text-slate-900">
							Create Field Survey Assignment
						</h2>
						<p className="text-xs text-slate-500">
							Assign auditor to retail competitor for cycle {surveyPeriodId}
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 transition"
					>
						✕
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4 text-xs">
					{/* Field Auditor Selector */}
					<div>
						<label className="block font-semibold text-slate-700 mb-1.5">
							Assigned Auditor
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

					{/* Competitor / Store Selector */}
					<div>
						<label className="block font-semibold text-slate-700 mb-1.5">
							Competitor Store
						</label>
						<select
							value={competitorId}
							onChange={(e) => setCompetitorId(e.target.value)}
							className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
						>
							{competitors.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name} — {c.market} ({c.type})
								</option>
							))}
						</select>
					</div>

					{/* Product Items Checklist */}
					<div>
						<div className="flex items-center justify-between mb-1.5">
							<label className="font-semibold text-slate-700">
								Products to Audit ({selectedItems.length}/{products.length})
							</label>
							<button
								type="button"
								onClick={handleSelectAll}
								className="text-[11px] font-bold text-[#017C4D] hover:underline"
							>
								{selectedItems.length === products.length
									? "Deselect All"
									: "Select All"}
							</button>
						</div>

						<div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
							{products.map((p) => {
								const checked = selectedItems.includes(p.id);
								return (
									<label
										key={p.id}
										className={`flex items-center justify-between rounded-lg p-2 transition cursor-pointer ${
											checked
												? "bg-white shadow-2xs font-semibold text-slate-900"
												: "text-slate-600 hover:bg-slate-100"
										}`}
									>
										<div className="flex items-center gap-2.5">
											<input
												type="checkbox"
												checked={checked}
												onChange={() => handleToggleItem(p.id)}
												className="rounded border-slate-300 text-[#A41821] focus:ring-[#A41821]"
											/>
											<span>
												{p.name} ({p.unit})
											</span>
										</div>
										<span className="text-[11px] text-slate-400 font-mono">
											Queens: {p.queensPrice.toFixed(2)} ETB
										</span>
									</label>
								);
							})}
						</div>
					</div>

					{/* Form Actions */}
					<div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
						<button
							type="button"
							onClick={onClose}
							className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs transition"
						>
							Dispatch Assignment
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
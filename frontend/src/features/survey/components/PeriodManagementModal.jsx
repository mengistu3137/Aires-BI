import React, { useState } from "react";
import { usePeriods } from "../hooks/usePeriods.js";
import toast from "react-hot-toast";

export const PeriodManagementModal = ({ isOpen, onClose }) => {
	const { periods, createPeriod, updateStatus, isLoading } = usePeriods();

	const [id, setId] = useState("2026-W40");
	const [name, setName] = useState("Week 40 Retail Survey Cycle 2026");
	const [startDate, setStartDate] = useState("2026-09-28");
	const [endDate, setEndDate] = useState("2026-10-04");
	const [status, setStatus] = useState("OPEN");
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!id.trim() || !name.trim()) {
			toast.error("Please enter a valid Period ID and Name");
			return;
		}

		setIsSubmitting(true);
		try {
			// Format into strict ISO datetime strings required by backend Zod validation
			const startIso = new Date(`${startDate}T00:00:00Z`).toISOString();
			const endIso = new Date(`${endDate}T23:59:59Z`).toISOString();

			await createPeriod({
				id: id.trim(),
				name: name.trim(),
				startDate: startIso,
				endDate: endIso,
				status,
			});

			onClose();
		} catch {
			// Error handled by mutation hook toast
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleToggleStatus = async (periodId, currentStatus) => {
		const nextStatus = currentStatus === "OPEN" ? "CLOSED" : "OPEN";
		try {
			await updateStatus({ id: periodId, status: nextStatus });
		} catch {
			// Error handled by hook
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
			<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-none">
					<div>
						<h2 className="text-base font-black text-slate-900">
							Survey Cycle Management
						</h2>
						<p className="text-xs text-slate-500">
							Configure and open/close weekly retail price survey cycles
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

				{/* Existing Survey Cycles List */}
				<div className="space-y-2 flex-none">
					<label className="font-bold text-xs text-slate-700">
						Existing Cycles ({periods?.length || 0})
					</label>
					<div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
						{isLoading ? (
							<p className="text-xs text-slate-400 text-center py-3">
								Loading cycles...
							</p>
						) : (periods || []).length === 0 ? (
							<p className="text-xs text-slate-400 text-center py-3">
								No survey cycles found.
							</p>
						) : (
							(periods || []).map((p) => {
								const isOpenCycle = p.status === "OPEN";

								return (
									<div
										key={p.id}
										className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-100 text-xs shadow-2xs"
									>
										<div className="min-w-0 flex-1 pr-2">
											<div className="flex items-center gap-2">
												<span className="font-black text-slate-900 font-mono">
													{p.id}
												</span>
												<span
													className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
														isOpenCycle
															? "bg-emerald-50 text-[#017C4D] border border-emerald-200"
															: "bg-slate-100 text-slate-500"
													}`}
												>
													{p.status}
												</span>
											</div>
											<span className="text-[11px] text-slate-500 truncate block mt-0.5">
												{p.name}
											</span>
										</div>

										<button
											type="button"
											onClick={() => handleToggleStatus(p.id, p.status)}
											className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer flex-none ${
												isOpenCycle
													? "border-red-200 text-[#A41821] hover:bg-red-50"
													: "border-emerald-200 text-[#017C4D] hover:bg-emerald-50"
											}`}
										>
											{isOpenCycle ? "Close Cycle" : "Reopen Cycle"}
										</button>
									</div>
								);
							})
						)}
					</div>
				</div>

				{/* Create New Period Form */}
				<form
					onSubmit={handleSubmit}
					className="space-y-3 text-xs border-t border-slate-100 pt-3 flex-1 overflow-y-auto"
				>
					<h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">
						Launch New Survey Cycle
					</h3>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Period ID (Format: YYYY-Www)
							</label>
							<input
								type="text"
								required
								pattern="^\d{4}-W\d{2}$"
								placeholder="2026-W40"
								value={id}
								onChange={(e) => setId(e.target.value)}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 font-mono font-bold focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
							/>
						</div>
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Status
							</label>
							<select
								value={status}
								onChange={(e) => setStatus(e.target.value)}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
							>
								<option value="OPEN">OPEN (Active)</option>
								<option value="DRAFT">DRAFT</option>
								<option value="CLOSED">CLOSED</option>
							</select>
						</div>
					</div>

					<div>
						<label className="block font-semibold text-slate-700 mb-1">
							Cycle Description
						</label>
						<input
							type="text"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Start Date
							</label>
							<input
								type="date"
								required
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
							/>
						</div>
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								End Date
							</label>
							<input
								type="date"
								required
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
							/>
						</div>
					</div>

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
							disabled={isSubmitting}
							className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
						>
							{isSubmitting ? "Creating..." : "Create Period"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
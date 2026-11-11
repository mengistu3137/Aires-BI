import React, { useState, useEffect, useMemo } from "react";
import { usePeriods } from "../hooks/usePeriods.js";
import { useAuth } from "@/hooks/useAuth.js";
import { ConfirmDialog } from "@/components/ConfirmDialog.jsx";
import toast from "react-hot-toast";

const getNextIsoWeekDetails = (existingPeriods = []) => {
	const now = new Date();
	const dayOfWeek = now.getDay() || 7;
	const monday = new Date(now);
	monday.setDate(now.getDate() - dayOfWeek + 1);

	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);

	const jan4 = new Date(now.getFullYear(), 0, 4);
	const diff = now - jan4;
	const oneWeek = 1000 * 60 * 60 * 24 * 7;
	let weekNum = Math.ceil(diff / oneWeek + 1);

	let year = now.getFullYear();
	let candidateId = `${year}-W${String(weekNum).padStart(2, "0")}`;

	if (existingPeriods.some((p) => p.id === candidateId)) {
		weekNum += 1;
		candidateId = `${year}-W${String(weekNum).padStart(2, "0")}`;
		monday.setDate(monday.getDate() + 7);
		sunday.setDate(sunday.getDate() + 7);
	}

	const startDate = monday.toISOString().split("T")[0];
	const endDate = sunday.toISOString().split("T")[0];
	const name = `Week ${weekNum} Retail Survey Cycle ${year}`;

	return { id: candidateId, name, startDate, endDate };
};

const formatCycleDate = (dateStr) => {
	if (!dateStr) return "—";
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return "—";
	return d.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

export const PeriodManagementModal = ({ isOpen, onClose }) => {
	const {
		periods = [],
		createPeriod,
		updatePeriod,
		deletePeriod,
		updateStatus,
		isLoading,
	} = usePeriods();
	const { isQueensAdmin } = useAuth();

	const [id, setId] = useState("");
	const [name, setName] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [status, setStatus] = useState("OPEN");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [statusTogglingId, setStatusTogglingId] = useState(null);
	const [healingId, setHealingId] = useState(null);

	// Reusable Modal-based confirmation (No window.confirm!)
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [isDeletingTarget, setIsDeletingTarget] = useState(false);

	const [editingPeriod, setEditingPeriod] = useState(null);
	const [expandedCycles, setExpandedCycles] = useState({});
	const [showArchivedSection, setShowArchivedSection] = useState(false);

	const toggleCycleExpansion = (cycleId) => {
		setExpandedCycles((prev) => ({
			...prev,
			[cycleId]: !prev[cycleId],
		}));
	};

	// Group daily cycles and segregate Active vs Archived weekly cycles
	const { activeWeeklyCycles, archivedWeeklyCycles, dailyByParent } =
		useMemo(() => {
			const active = [];
			const archived = [];
			const dailyMap = {};

			(periods || []).forEach((p) => {
				const isDaily =
					p.id.includes("-DAILY-") || p.name?.toLowerCase().includes("daily");

				if (isDaily) {
					const parentKey = p.id.split("-DAILY-")[0];
					if (!dailyMap[parentKey]) dailyMap[parentKey] = [];
					dailyMap[parentKey].push(p);
				} else if (p.status === "ARCHIVED") {
					archived.push(p);
				} else {
					active.push(p);
				}
			});

			Object.keys(dailyMap).forEach((k) => {
				dailyMap[k].sort(
					(a, b) => new Date(a.startDate) - new Date(b.startDate),
				);
			});

			return {
				activeWeeklyCycles: active,
				archivedWeeklyCycles: archived,
				dailyByParent: dailyMap,
			};
		}, [periods]);

	useEffect(() => {
		if (isOpen && !editingPeriod) {
			const defaults = getNextIsoWeekDetails(periods || []);
			setId(defaults.id);
			setName(defaults.name);
			setStartDate(defaults.startDate);
			setEndDate(defaults.endDate);
			setStatus("OPEN");
		}
	}, [isOpen, periods, editingPeriod]);

	if (!isOpen) return null;

	const handleStartEdit = (p) => {
		setEditingPeriod(p);
		setId(p.id);
		setName(p.name);
		setStartDate(p.startDate ? p.startDate.split("T")[0] : "");
		setEndDate(p.endDate ? p.endDate.split("T")[0] : "");
		setStatus(p.status || "OPEN");
	};

	const handleCancelEdit = () => {
		setEditingPeriod(null);
		const defaults = getNextIsoWeekDetails(periods || []);
		setId(defaults.id);
		setName(defaults.name);
		setStartDate(defaults.startDate);
		setEndDate(defaults.endDate);
		setStatus("OPEN");
	};

	const handleHealCycle = async (p) => {
		setHealingId(p.id);
		try {
			await updatePeriod({
				id: p.id,
				name: p.name,
				startDate: p.startDate,
				endDate: p.endDate,
				status: p.status,
			});
			toast.success(`Successfully healed 7 daily cycles for ${p.id}`);
			setExpandedCycles((prev) => ({ ...prev, [p.id]: true }));
		} catch (err) {
			toast.error(err?.response?.data?.message || "Failed to heal cycle");
		} finally {
			setHealingId(null);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!id.trim() || !name.trim()) {
			toast.error("Please enter a valid Period ID and Name");
			return;
		}

		setIsSubmitting(true);
		try {
			const startIso = new Date(`${startDate}T00:00:00Z`).toISOString();
			const endIso = new Date(`${endDate}T23:59:59Z`).toISOString();

			if (editingPeriod) {
				await updatePeriod({
					id: editingPeriod.id,
					name: name.trim(),
					startDate: startIso,
					endDate: endIso,
					status,
				});
				toast.success(`Cycle ${editingPeriod.id} and daily streams updated`);
				handleCancelEdit();
			} else {
				await createPeriod({
					id: id.trim(),
					name: name.trim(),
					startDate: startIso,
					endDate: endIso,
					status,
				});
				toast.success("Survey cycle and 7 daily streams created");
				onClose();
			}
		} catch (err) {
			toast.error(
				err?.response?.data?.message || err?.message || "Operation failed",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	

	const handleConfirmDelete = async () => {
		if (!deleteTarget) return;
		setIsDeletingTarget(true);
		try {
			await deletePeriod(deleteTarget.id);
			toast.success(`Cycle ${deleteTarget.id} deleted successfully`);
			if (editingPeriod?.id === deleteTarget.id) handleCancelEdit();
			setDeleteTarget(null);
		} catch (err) {
			toast.error(
				err?.response?.data?.message ||
					err?.message ||
					"Failed to delete cycle",
			);
		} finally {
			setIsDeletingTarget(false);
		}
	};
	const handleToggleStatus = async (periodId, targetStatus) => {
		setStatusTogglingId(periodId);
		try {
			await updateStatus({ id: periodId, status: targetStatus });
			toast.success(`Cycle status updated to ${targetStatus}`);
		} catch (err) {
			toast.error(
				err?.response?.data?.message ||
					err?.message ||
					"Failed to update cycle status",
			);
		} finally {
			setStatusTogglingId(null);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
			<div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-none">
					<div>
						<h2 className="text-base font-black text-slate-900">
							Survey Cycle Management
						</h2>
						<p className="text-xs text-slate-500">
							Configure weekly cycles, unarchive cycles, and auto-heal daily
							streams
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

				{/* Active Survey Cycles List */}
				<div className="space-y-2 flex-1 overflow-y-auto pr-1">
					<div className="flex items-center justify-between text-xs font-bold text-slate-700">
						<span>Active Survey Cycles</span>
						<span className="font-mono text-slate-400 text-[11px]">
							{activeWeeklyCycles.length} active weekly cycles
						</span>
					</div>

					<div className="space-y-2">
						{isLoading ? (
							<p className="text-xs text-slate-400 text-center py-3">
								Loading cycles...
							</p>
						) : activeWeeklyCycles.length === 0 ? (
							<p className="text-xs text-slate-400 text-center py-3">
								No active cycles found.
							</p>
						) : (
							activeWeeklyCycles.map((p) => {
								const isOpenCycle = p.status === "OPEN";
								const isToggling = statusTogglingId === p.id;
								const isHealing = healingId === p.id;
								const dailyChildren = dailyByParent[p.id] || [];
								const isExpanded = Boolean(expandedCycles[p.id]);

								// Dynamic Delete vs Archive condition
								const hasActivity =
									(p._count?.assignments || 0) > 0 ||
									(p._count?.audits || 0) > 0;
								const canDelete = !hasActivity;

								return (
									<div
										key={p.id}
										className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2 flex-wrap">
													{/* Extending Arrow */}
													<button
														type="button"
														onClick={() => toggleCycleExpansion(p.id)}
														className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer text-[10px] font-bold transition"
														title={
															isExpanded
																? "Collapse daily streams"
																: "Expand daily streams"
														}
													>
														{isExpanded ? "▼" : "▶"}
													</button>

													<span className="font-black text-slate-900 font-mono text-xs">
														{p.id}
													</span>

													<span
														className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
															isOpenCycle
																? "bg-emerald-50 text-[#017C4D] border border-emerald-200"
																: "bg-slate-100 text-slate-500 border border-slate-200"
														}`}
													>
														{p.status}
													</span>

													{/* Gray span indicating dates */}
													<span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500 border border-slate-200">
														{formatCycleDate(p.startDate)} –{" "}
														{formatCycleDate(p.endDate)}
													</span>
												</div>

												<div className="flex items-center gap-2 mt-1">
													<span className="text-[11px] font-semibold text-slate-700 truncate">
														{p.name}
													</span>
													{dailyChildren.length > 0 ? (
														<span className="text-[10px] text-emerald-700 font-semibold">
															({dailyChildren.length} daily streams)
														</span>
													) : (
														<span className="text-[10px] text-amber-600 font-semibold">
															(No daily streams)
														</span>
													)}
												</div>
											</div>

											{/* Action Controls */}
											{!isQueensAdmin && (
												<div className="flex items-center gap-1.5 flex-none">
													{/* 1-Click Heal */}
													{dailyChildren.length === 0 && (
														<button
															type="button"
															disabled={isHealing}
															onClick={() => handleHealCycle(p)}
															className="text-[10px] font-bold px-2 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-[#017C4D] hover:bg-emerald-100 transition cursor-pointer"
															title="Generate missing daily cycles for this week"
														>
															{isHealing ? "Healing..." : "⚡ Heal"}
														</button>
													)}

													<button
														type="button"
														onClick={() => handleStartEdit(p)}
														className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
													>
														Edit
													</button>

													{/* Dynamic Delete vs Archive button */}
													{canDelete ? (
														<button
															type="button"
															onClick={() => setDeleteTarget(p)}
															className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition cursor-pointer"
															title="Cycle has no linked audits; delete permanently"
														>
															Delete
														</button>
													) : (
														<button
															type="button"
															disabled={isToggling}
															onClick={() =>
																handleToggleStatus(p.id, "ARCHIVED")
															}
															className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
															title="Cycle has linked audits; archive instead"
														>
															Archive
														</button>
													)}

													<button
														type="button"
														disabled={isToggling}
														onClick={() =>
															handleToggleStatus(
																p.id,
																isOpenCycle ? "CLOSED" : "OPEN",
															)
														}
														className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
															isOpenCycle
																? "border-red-200 bg-red-50 text-[#A41821] hover:bg-red-100"
																: "border-emerald-200 bg-emerald-50 text-[#017C4D] hover:bg-emerald-100"
														}`}
													>
														{isToggling
															? "..."
															: isOpenCycle
																? "Close"
																: "Open"}
													</button>
												</div>
											)}
										</div>

										{/* Collapsible Daily Cycles */}
										{isExpanded && (
											<div className="ml-5 pl-2.5 border-l-2 border-emerald-300 space-y-1.5 pt-1.5 animate-in fade-in duration-150">
												{dailyChildren.length === 0 ? (
													<div className="flex items-center justify-between text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
														<span>
															No daily streams created yet for this week.
														</span>
														<button
															type="button"
															onClick={() => handleHealCycle(p)}
															className="font-bold underline cursor-pointer text-xs"
														>
															Click to generate now
														</button>
													</div>
												) : (
													dailyChildren.map((d) => (
														<div
															key={d.id}
															className="flex items-center justify-between text-[11px] bg-slate-50/80 px-2 py-1 rounded-lg border border-slate-200"
														>
															<div className="flex items-center gap-2">
																<span className="h-1.5 w-1.5 rounded-full bg-[#017C4D]" />
																<span className="font-semibold text-slate-800">
																	{d.name}
																</span>
																<span className="text-[10px] font-mono text-slate-400">
																	({formatCycleDate(d.startDate)})
																</span>
															</div>
															<span className="rounded bg-white px-1.5 py-0.2 font-mono text-[9px] font-bold border border-slate-200 text-slate-600">
																{d.status}
															</span>
														</div>
													))
												)}
											</div>
										)}
									</div>
								);
							})
						)}
					</div>

					{/* ARCHIVED CYCLES SECTION (Where archived cycles live) */}
					{archivedWeeklyCycles.length > 0 && (
						<div className="pt-3 border-t border-slate-200">
							<div
								onClick={() => setShowArchivedSection(!showArchivedSection)}
								className="flex items-center justify-between text-xs font-bold text-slate-500 cursor-pointer hover:text-slate-800 select-none pb-1.5"
							>
								<span>
									{showArchivedSection ? "▼" : "▶"} Archived Cycles (
									{archivedWeeklyCycles.length})
								</span>
								<span className="text-[10px] font-semibold text-slate-400">
									{showArchivedSection
										? "Click to collapse"
										: "Click to view & unarchive"}
								</span>
							</div>

							{showArchivedSection && (
								<div className="space-y-1.5 pt-1 animate-in fade-in">
									{archivedWeeklyCycles.map((ap) => (
										<div
											key={ap.id}
											className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
										>
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="font-mono font-bold text-slate-700">
														{ap.id}
													</span>
													<span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-600 uppercase">
														ARCHIVED
													</span>
													<span className="font-mono text-[10px] text-slate-400">
														{formatCycleDate(ap.startDate)} –{" "}
														{formatCycleDate(ap.endDate)}
													</span>
												</div>
												<span className="text-[11px] text-slate-500 truncate block mt-0.5">
													{ap.name}
												</span>
											</div>

											{!isQueensAdmin && (
												<button
													type="button"
													onClick={() => handleToggleStatus(ap.id, "CLOSED")}
													className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer transition shadow-2xs"
												>
													Unarchive
												</button>
											)}
										</div>
									))}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Create / Edit Form */}
				{!isQueensAdmin && (
					<form
						onSubmit={handleSubmit}
						className="space-y-3 text-xs border-t border-slate-100 pt-3 flex-none"
					>
						<div className="flex items-center justify-between">
							<h3 className="font-black text-slate-800 text-xs uppercase tracking-wider">
								{editingPeriod
									? `Edit Survey Cycle (${editingPeriod.id})`
									: "Launch New Survey Cycle"}
							</h3>
							<span className="text-[10px] text-slate-400 font-medium">
								{editingPeriod
									? "Saves & heals daily streams"
									: "Auto-creates 7 daily streams"}
							</span>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Period ID {editingPeriod ? "(Fixed)" : "(Format: YYYY-Www)"}
								</label>
								<input
									type="text"
									required
									disabled={Boolean(editingPeriod)}
									pattern="^[A-Za-z0-9_-]+$"
									placeholder="2026-W40"
									value={id}
									onChange={(e) => setId(e.target.value)}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 font-mono font-bold focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden disabled:bg-slate-100 disabled:text-slate-500"
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
									<option value="OPEN">OPEN (Active Operational)</option>
									<option value="DRAFT">DRAFT</option>
									<option value="CLOSED">CLOSED</option>
									<option value="ARCHIVED">ARCHIVED</option>
								</select>
							</div>
						</div>

						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Cycle Description Name
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
									Start Date (Monday)
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
									End Date (Sunday)
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
							{editingPeriod ? (
								<button
									type="button"
									onClick={handleCancelEdit}
									className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
								>
									Cancel
								</button>
							) : (
								<button
									type="button"
									onClick={onClose}
									className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
								>
									Cancel
								</button>
							)}
							<button
								type="submit"
								disabled={isSubmitting}
								className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
							>
								{isSubmitting
									? "Saving & Healing..."
									: editingPeriod
										? "Update & Heal Cycle"
										: "Launch Survey Cycle"}
							</button>
						</div>
					</form>
				)}
			</div>

			{/* Reusable ConfirmDialog Component (No window.confirm!) */}
			<ConfirmDialog
				open={Boolean(deleteTarget)}
				title={`Delete cycle ${deleteTarget?.id}?`}
				message={`Are you sure you want to permanently delete "${deleteTarget?.name}" and its unassigned daily streams?`}
				details="Cycles with no active assignments or field audits can be safely deleted. This action cannot be undone."
				confirmLabel="Delete "
				cancelLabel="Cancel"
				variant="danger"
				isConfirming={isDeletingTarget}
				onCancel={() => setDeleteTarget(null)}
				onConfirm={handleConfirmDelete}
			/>
		</div>
	);
};
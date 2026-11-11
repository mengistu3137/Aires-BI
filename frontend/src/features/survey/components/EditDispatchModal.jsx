import React, { useState, useEffect, useMemo } from "react";
import { usePeriods } from "../hooks/usePeriods.js";
import { useUsers } from "@/features/users/hooks/useUsers.js";
import { useUpdateDispatchCycle } from "../hooks/useAssignments.js";
import { CollapsibleCycleSelect } from "./CollapsibleCycleSelect.jsx";
import { StatusBadge } from "@/components/StatusBadge.jsx";
import toast from "react-hot-toast";

export const EditDispatchModal = ({ isOpen, onClose, dispatch }) => {
	const { periods = [] } = usePeriods();
	const { users = [] } = useUsers();
	const updateDispatch = useUpdateDispatchCycle();

	const [targetCycleId, setTargetCycleId] = useState("");
	const [targetAuditorId, setTargetAuditorId] = useState("");

	// Auditors list
	const auditors = useMemo(
		() =>
			(users || []).filter(
				(u) => u.role === "FIELD_AUDITOR" && u.active !== false,
			),
		[users],
	);

	useEffect(() => {
		if (dispatch) {
			setTargetCycleId(dispatch.surveyPeriodId || "");
			const firstAuditorId = dispatch.assignments?.[0]?.auditorId || "";
			setTargetAuditorId(firstAuditorId);
		}
	}, [dispatch]);

	if (!isOpen || !dispatch) return null;

	const store = dispatch.store || {};
	const currentCycle = dispatch.surveyPeriod || {};
	const isCompleted = dispatch.overallStatus === "COMPLETED";

	const currentAuditorName =
		dispatch.assignments?.[0]?.auditor?.name || "Field Auditor";

	const isCycleChanged =
		targetCycleId && targetCycleId !== dispatch.surveyPeriodId;

	const isAuditorChanged =
		!isCompleted &&
		targetAuditorId &&
		targetAuditorId !== dispatch.assignments?.[0]?.auditorId;

	const hasChanges = isCycleChanged || isAuditorChanged;

	const handleSave = async (e) => {
		e.preventDefault();
		if (!hasChanges) {
			onClose();
			return;
		}

		try {
			await updateDispatch.mutateAsync({
				storeId: dispatch.storeId,
				currentSurveyPeriodId: dispatch.surveyPeriodId,
				newSurveyPeriodId: isCycleChanged ? targetCycleId : undefined,
				newAuditorId: isAuditorChanged ? targetAuditorId : undefined,
			});
			onClose();
		} catch {
			// Handled by mutation toast
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in">
			<div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 pb-3">
					<div>
						<h2 className="text-base font-black text-slate-900">
							Edit Store Dispatch
						</h2>
						<p className="text-xs text-slate-500">
							Update survey stream or reassign field auditor
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="cursor-pointer p-1 text-slate-400 hover:text-slate-600"
					>
						✕
					</button>
				</div>

				{/* Dispatch Current Context Card */}
				<div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
					<div className="flex items-start justify-between gap-2">
						<div>
							<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
								Target Store
							</span>
							<p className="font-bold text-slate-900 text-sm">
								{store.name || "Store"}
							</p>
							<p className="text-[11px] text-slate-500">
								{store.area || store.address || "Addis Ababa"} • {store.type}
							</p>
						</div>
						<StatusBadge status={dispatch.overallStatus} />
					</div>

					<div className="flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono text-[11px]">
						<span className="text-slate-500">Progress:</span>
						<span className="font-bold text-slate-800">
							{dispatch.observedCount} / {dispatch.totalProducts} items observed
							({dispatch.percentDone}%)
						</span>
					</div>
				</div>

				{/* Form */}
				<form onSubmit={handleSave} className="space-y-4 text-xs">
					{/* 1. Reusable Collapsible Survey Cycle Dropdown */}
					<CollapsibleCycleSelect
						value={targetCycleId}
						onChange={setTargetCycleId}
						periods={periods}
						label="Assigned Survey Cycle (Click to expand daily streams)"
					/>

					{/* 2. Assigned Field Auditor Section */}
					<div>
						<label className="mb-1 block font-bold text-slate-700">
							Assigned Field Auditor
						</label>

						{isCompleted ? (
							// Locked if COMPLETED to preserve audit accountability
							<div className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 flex items-center justify-between">
								<span>{currentAuditorName}</span>
								<span className="rounded bg-emerald-100 text-[#017C4D] px-1.5 py-0.5 text-[10px] font-bold">
									Verified (Locked)
								</span>
							</div>
						) : (
							// Editable if NOT_STARTED or IN_PROGRESS
							<select
								value={targetAuditorId}
								onChange={(e) => setTargetAuditorId(e.target.value)}
								className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] cursor-pointer"
							>
								{auditors.map((a) => (
									<option key={a.id} value={a.id}>
										{a.name} ({a.phone || "No phone"})
									</option>
								))}
							</select>
						)}

						{isCompleted ? (
							<p className="mt-1 text-[10px] text-slate-400">
								Auditor is locked because field observation proofs have already
								been recorded.
							</p>
						) : (
							<p className="mt-1 text-[10px] text-slate-500">
								You can transfer this store audit to any active field auditor.
							</p>
						)}
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
						<button
							type="button"
							onClick={onClose}
							className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!hasChanges || updateDispatch.isPending}
							className="cursor-pointer rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs disabled:opacity-50"
						>
							{updateDispatch.isPending ? "Updating..." : "Save Changes"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
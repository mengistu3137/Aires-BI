import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { useAssignments } from "../hooks/useAssignments.js";
import { useSurveySessionStore } from "@/stores/survey/surveySession.store.js";
import { StatusBadge } from "@/components/StatusBadge.jsx";

export const SurveyorHomePage = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { assignments, isLoading, updateStatus } = useAssignments();
	const { setActiveAssignment } = useSurveySessionStore();

	// Dynamic time-of-day greeting
	const greeting = useMemo(() => {
		const hour = new Date().getHours();
		if (hour < 12) return "Good morning";
		if (hour < 17) return "Good afternoon";
		return "Good evening";
	}, []);

	// Compute assignment metrics strictly from real API data
	const metrics = useMemo(() => {
		const total = assignments.length;
		const completed = assignments.filter(
			(a) => a.status === "COMPLETED",
		).length;
		const inProgress = assignments.filter(
			(a) => a.status === "IN_PROGRESS",
		).length;
		const remaining = total - completed;
		return { total, completed, inProgress, remaining };
	}, [assignments]);

	// Active survey cycle name derived from first assignment
	const activeCycle = assignments[0]?.surveyPeriod;

	const handleStartOrContinueAudit = async (assignment) => {
		// If not started, transition status to IN_PROGRESS
		if (assignment.status === "NOT_STARTED") {
			try {
				await updateStatus({ id: assignment.id, status: "IN_PROGRESS" });
				assignment.status = "IN_PROGRESS";
			} catch (err) {
				console.warn("Status transition note:", err.message);
			}
		}

		// Lock assignment in session store
		setActiveAssignment(assignment);

		// Navigate directly into rapid collection view
		navigate(`/survey/audit/${assignment.id}`);
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<div className="h-9 w-9 animate-spin rounded-full border-3 border-[#A41821] border-t-transparent" />
					<p className="text-xs font-semibold text-slate-500">
						Loading your store assignments...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-xl space-y-5 pb-16">
			{/* 1. Header & Surveyor Greeting */}
			<div className="space-y-1">
				<p className="text-xs font-bold uppercase tracking-wider text-slate-400">
					Field Auditor Workspace
				</p>
				<h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
					{greeting}, {user?.name || "Surveyor"}
				</h1>
				{activeCycle && (
					<div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-[#017C4D] border border-emerald-200 mt-1">
						<span className="h-1.5 w-1.5 rounded-full bg-[#017C4D] animate-pulse" />
						<span>
							{activeCycle.id}: {activeCycle.name}
						</span>
					</div>
				)}
			</div>

			{/* 2. Today's Summary Metrics Bar */}
			<div className="grid grid-cols-3 gap-2.5">
				<div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-2xs">
					<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
						Assigned
					</span>
					<p className="text-xl font-black text-slate-900 mt-0.5">
						{metrics.total}
					</p>
					<span className="text-[10px] text-slate-500 font-medium">
						Target Stores
					</span>
				</div>

				<div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 text-center shadow-2xs">
					<span className="text-[10px] font-bold text-[#FE7914] uppercase tracking-wider">
						Active
					</span>
					<p className="text-xl font-black text-[#FE7914] mt-0.5">
						{metrics.inProgress}
					</p>
					<span className="text-[10px] text-amber-700 font-medium">
						In Progress
					</span>
				</div>

				<div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 text-center shadow-2xs">
					<span className="text-[10px] font-bold text-[#017C4D] uppercase tracking-wider">
						Completed
					</span>
					<p className="text-xl font-black text-[#017C4D] mt-0.5">
						{metrics.completed}
					</p>
					<span className="text-[10px] text-emerald-700 font-medium">
						{metrics.remaining} Remaining
					</span>
				</div>
			</div>

			{/* 3. Assigned Stores List */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-bold text-slate-900 tracking-tight">
						Assigned Stores ({assignments.length})
					</h2>
					<span className="text-[11px] font-medium text-slate-500">
						Tap a store to start collecting
					</span>
				</div>

				{assignments.length === 0 ? (
					<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
							<svg
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={1.8}
									d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
								/>
							</svg>
						</div>
						<h3 className="text-sm font-bold text-slate-800">
							No Assignments Available
						</h3>
						<p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
							Your account has no active field store assignments for this survey
							period. Please check with your survey manager.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{assignments.map((assignment) => {
							const isCompleted = assignment.status === "COMPLETED";
							const isInProgress = assignment.status === "IN_PROGRESS";
							const totalItems =
								assignment.totalItemsCount || assignment.items?.length || 0;

							return (
								<div
									key={assignment.id}
									className={`rounded-2xl border p-4 shadow-xs transition-all ${
										isInProgress
											? "border-[#A41821]/40 bg-white ring-2 ring-[#A41821]/10"
											: isCompleted
												? "border-emerald-200 bg-emerald-50/20"
												: "border-slate-200 bg-white hover:border-slate-300"
									}`}
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<h3 className="font-bold text-slate-900 text-sm truncate">
													{assignment.store?.name}
												</h3>
											</div>
											<p className="text-xs text-slate-500 mt-0.5 truncate">
												{assignment.store?.address ||
													assignment.store?.area ||
													"Addis Ababa"}{" "}
												• {assignment.store?.type}
											</p>

											{assignment.store?.latitude && (
												<p className="text-[10px] text-slate-400 font-mono mt-1">
													GPS: {Number(assignment.store.latitude).toFixed(5)},{" "}
													{Number(assignment.store.longitude).toFixed(5)}
												</p>
											)}
										</div>

										<StatusBadge status={assignment.status} />
									</div>

									{/* Items badge & Action Button */}
									<div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
										<div className="flex items-center gap-1.5">
											<span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
												{totalItems} Products
											</span>
											<span className="text-[11px] text-slate-400 hidden sm:inline">
												assigned for audit
											</span>
										</div>

										<button
											type="button"
											onClick={() => handleStartOrContinueAudit(assignment)}
											className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs ${
												isInProgress
													? "bg-[#A41821] hover:bg-[#7F1219] text-white"
													: isCompleted
														? "border border-emerald-300 bg-white text-[#017C4D] hover:bg-emerald-50"
														: "bg-[#017C4D] hover:bg-[#015E3A] text-white"
											}`}
										>
											<span>
												{isInProgress
													? "Continue Audit →"
													: isCompleted
														? "Review Items"
														: "Start Audit →"}
											</span>
										</button>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
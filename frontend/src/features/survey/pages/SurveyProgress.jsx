import React, { useState, useEffect } from "react";
import { useSurveyStore } from "@/stores/survey/survey.store.js";
import { StatusBadge } from "@/components/StatusBadge.jsx";
import { ProgressBar } from "@/components/ProgressBar.jsx";
import { DataTable } from "@/components/DataTable.jsx";
import { SurveyAssignmentModal } from "../components/SurveyAssignmentModal.jsx";
import { Can } from "@/components/Can.jsx";
import { initOfflineAutoSync } from "@/pwa/offlineSync.js";
import toast from "react-hot-toast";

export const SurveyProgress = () => {
	const {
		assignments,
		surveyEntries,
		offlineQueue,
		isSyncing,
		syncOfflineQueue,
		products,
		competitors,
	} = useSurveyStore();

	const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

	// Initialize auto-sync on component mount
	useEffect(() => {
		initOfflineAutoSync();
	}, []);

	const handleManualSync = async () => {
		try {
			const res = await syncOfflineQueue();
			toast.success(`Successfully synced ${res.syncedCount} entries!`);
		} catch {
			toast.error("Offline sync failed. Check your network connection.");
		}
	};

	// Define DataTable columns
	const tableColumns = [
		{
			header: "Product Item",
			key: "itemName",
			sortable: true,
			render: (row) => {
				const prod = products.find((p) => p.id === row.itemId);
				return (
					<div>
						<div className="font-bold text-slate-900">
							{prod?.name || row.itemId}
						</div>
						<span className="text-[10px] font-mono text-slate-400">
							[{row.itemId}]
						</span>
					</div>
				);
			},
		},
		{
			header: "Competitor",
			key: "competitorName",
			sortable: true,
			render: (row) => {
				const comp = competitors.find((c) => c.id === row.competitorId);
				return (
					<div>
						<span className="font-medium text-slate-800">
							{comp?.name || row.competitorId}
						</span>
						<span className="block text-[10px] text-slate-400">
							{row.marketName}
						</span>
					</div>
				);
			},
		},
		{
			header: "Observed Price",
			key: "price",
			sortable: true,
			render: (row) => (
				<span className="font-mono font-bold text-slate-900">
					{Number(row.price).toFixed(2)} ETB
				</span>
			),
		},
		{
			header: "GPS Audit Lock",
			key: "accuracy",
			render: (row) =>
				row.latitude ? (
					<div className="font-mono text-[11px] text-slate-500">
						{row.latitude}, {row.longitude}{" "}
						<span className="text-[10px] text-emerald-600 font-semibold">
							(±{row.accuracy || 0}m)
						</span>
					</div>
				) : (
					<span className="text-slate-400 italic">No GPS coordinates</span>
				),
		},
		{
			header: "Sync Status",
			key: "syncStatus",
			align: "right",
			render: (row) => <StatusBadge status={row.syncStatus} />,
		},
	];

	return (
		<div className="mx-auto max-w-5xl space-y-6 pb-12">
			{/* Header Banner */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-xl font-black text-slate-900 tracking-tight">
						Assignments & Sync Queue
					</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						Audit completion progress, assignment dispatching, and offline
						queues
					</p>
				</div>

				<div className="flex items-center gap-2">
					{/* Dispatch Assignment button for Managers / Admins */}
					<Can role={["ADMIN", "MANAGER"]}>
						<button
							type="button"
							onClick={() => setIsAssignmentModalOpen(true)}
							className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition active:scale-95"
						>
							<span className="text-sm font-bold text-[#A41821]">+</span>
							Dispatch Assignment
						</button>
					</Can>

					{/* Sync Queue Button */}
					<button
						type="button"
						onClick={handleManualSync}
						disabled={isSyncing || offlineQueue.length === 0}
						className="inline-flex items-center gap-2 rounded-xl bg-[#017C4D] hover:bg-[#015E3A] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-40"
					>
						<svg
							className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						{isSyncing ? "Syncing..." : `Sync Queue (${offlineQueue.length})`}
					</button>
				</div>
			</div>

			{/* Assignment Progress Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{assignments.map((asn) => {
					const comp = competitors.find((c) => c.id === asn.competitorId);
					const totalItems = asn.items?.length || 0;
					const completedEntries = surveyEntries.filter(
						(e) =>
							e.competitorId === asn.competitorId &&
							(!e.surveyPeriodId || e.surveyPeriodId === asn.surveyPeriodId),
					);

					return (
						<div
							key={asn.id}
							className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
						>
							<div className="flex items-start justify-between">
								<div>
									<h3 className="text-base font-bold text-slate-900">
										{comp?.name || asn.competitorId}
									</h3>
									<p className="text-xs text-slate-500 font-medium">
										{asn.marketName}
									</p>
								</div>
								<StatusBadge status={asn.status} />
							</div>

							<ProgressBar
								current={completedEntries.length}
								total={totalItems}
								label="Surveyed Items"
								color="#017C4D"
							/>

							<div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
								<span>Cycle: {asn.surveyPeriodId}</span>
								<span>
									Assigned: {new Date(asn.assignedAt).toLocaleDateString()}
								</span>
							</div>
						</div>
					);
				})}
			</div>

			{/* Collected Price Log rendered with DataTable */}
			<div className="space-y-2">
				<h2 className="text-sm font-bold text-slate-800">
					Collected Field Audit Log ({surveyEntries.length})
				</h2>
				<DataTable
					columns={tableColumns}
					data={surveyEntries}
					searchPlaceholder="Search product, competitor, or market..."
					pageSize={8}
					emptyMessage="No surveys submitted yet for this cycle."
				/>
			</div>

			{/* Assignment Dispatch Modal */}
			<SurveyAssignmentModal
				isOpen={isAssignmentModalOpen}
				onClose={() => setIsAssignmentModalOpen(false)}
			/>
		</div>
	);
};
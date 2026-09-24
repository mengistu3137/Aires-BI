import React, { useState } from "react";
import { useAssignments } from "../hooks/useAssignments.js";
import { useAuth } from "@/hooks/useAuth.js";
import { StatusBadge } from "@/components/StatusBadge.jsx";
import { ProgressBar } from "@/components/ProgressBar.jsx";
import { DataTable } from "@/components/DataTable.jsx";
import { SurveyAssignmentModal } from "../components/SurveyAssignmentModal.jsx";
import { PeriodManagementModal } from "../components/PeriodManagementModal.jsx";
import { Can } from "@/components/Can.jsx";

export const SurveyProgress = () => {
	const { isAuditor } = useAuth();
	const { assignments, isLoading, updateStatus, isUpdating } = useAssignments();
	const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
	const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

	const handleStatusChange = async (assignmentId, currentStatus) => {
		let nextStatus = "IN_PROGRESS";
		if (currentStatus === "NOT_STARTED") nextStatus = "IN_PROGRESS";
		else if (currentStatus === "IN_PROGRESS") nextStatus = "COMPLETED";
		else if (currentStatus === "COMPLETED") nextStatus = "IN_PROGRESS";

		await updateStatus({ id: assignmentId, status: nextStatus });
	};

	const tableColumns = [
		{
			header: "Store Location",
			key: "storeName",
			sortable: true,
			render: (row) => (
				<div>
					<span className="font-bold text-slate-900">{row.store?.name}</span>
					<span className="block text-[11px] text-slate-500">
						{row.store?.address || row.store?.area || "Addis Ababa"}
					</span>
				</div>
			),
		},
		{
			header: "Assigned Auditor",
			key: "auditorName",
			sortable: true,
			render: (row) => (
				<div>
					<span className="font-medium text-slate-800">
						{row.auditor?.name}
					</span>
					<span className="block text-[10px] text-slate-400 font-mono">
						{row.auditor?.phone}
					</span>
				</div>
			),
		},
		{
			header: "Store GPS Coordinates",
			key: "gps",
			render: (row) =>
				row.store?.latitude ? (
					<div className="font-mono text-[11px] text-slate-600">
						{row.store.latitude}, {row.store.longitude}
					</div>
				) : (
					<span className="text-slate-400 italic">No GPS set</span>
				),
		},
		{
			header: "Assigned Items",
			key: "itemsCount",
			align: "center",
			render: (row) => (
				<span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
					{row.totalItemsCount || row.items?.length || 0} products
				</span>
			),
		},
		{
			header: "Status",
			key: "status",
			align: "center",
			render: (row) => <StatusBadge status={row.status} />,
		},
		{
			header: "Action",
			key: "actions",
			align: "right",
			render: (row) => (
				<button
					type="button"
					disabled={isUpdating}
					onClick={() => handleStatusChange(row.id, row.status)}
					className="text-xs font-semibold text-[#017C4D] hover:underline cursor-pointer disabled:opacity-50"
				>
					{row.status === "NOT_STARTED"
						? "Start Audit"
						: row.status === "IN_PROGRESS"
							? "Mark Complete"
							: "Reopen"}
				</button>
			),
		},
	];

	return (
		<div className="mx-auto max-w-5xl space-y-6 pb-12">
			{/* Top Banner */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-xl font-black text-slate-900 tracking-tight">
						Field Survey Assignments
					</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						{isAuditor
							? "Your assigned store audits and target product checklists"
							: "Store dispatch management and weekly auditor field operations"}
					</p>
				</div>

				{/* Action Buttons for Managers & Admins */}
				<Can role={["ADMIN", "MANAGER"]}>
					<div className="flex items-center gap-2">
						{/* Manage Survey Cycles Button */}
						<button
							type="button"
							onClick={() => setIsPeriodModalOpen(true)}
							className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition active:scale-95 cursor-pointer"
						>
							<span>🗓️</span>
							Manage Cycles
						</button>

						{/* Dispatch Assignment Button */}
						<button
							type="button"
							onClick={() => setIsAssignmentModalOpen(true)}
							className="inline-flex items-center gap-1.5 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
						>
							<span className="text-sm font-bold">+</span>
							Dispatch Assignment
						</button>
					</div>
				</Can>
			</div>

			{/* Assignment Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{assignments.map((asn) => {
					const totalItems = asn.totalItemsCount || asn.items?.length || 0;
					const isDone = asn.status === "COMPLETED";

					return (
						<div
							key={asn.id}
							className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4"
						>
							<div className="flex items-start justify-between">
								<div>
									<h3 className="text-base font-bold text-slate-900">
										{asn.store?.name}
									</h3>
									<p className="text-xs text-slate-500 font-medium">
										{asn.store?.area || asn.store?.address || "Addis Ababa"} •{" "}
										{asn.store?.type}
									</p>
								</div>
								<StatusBadge status={asn.status} />
							</div>

							<ProgressBar
								current={
									isDone
										? totalItems
										: asn.status === "IN_PROGRESS"
											? Math.round(totalItems / 2)
											: 0
								}
								total={totalItems}
								label="Required Products Checklist"
								color={isDone ? "#017C4D" : "#FE7914"}
							/>

							<div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
								<span>Auditor: {asn.auditor?.name}</span>
								<span>Cycle: {asn.surveyPeriod?.id || "2026-W39"}</span>
							</div>
						</div>
					);
				})}
			</div>

			{/* Interactive Assignment Table */}
			<div className="space-y-2">
				<h2 className="text-sm font-bold text-slate-800">
					All Store Assignments ({assignments.length})
				</h2>
				<DataTable
					columns={tableColumns}
					data={assignments}
					searchPlaceholder="Search store, auditor, or area..."
					pageSize={8}
					emptyMessage={
						isLoading
							? "Loading assignments from server..."
							: "No active field assignments found."
					}
				/>
			</div>

			{/* 1. Dispatch Assignment Modal */}
			<SurveyAssignmentModal
				isOpen={isAssignmentModalOpen}
				onClose={() => setIsAssignmentModalOpen(false)}
			/>

			{/* 2. Period / Survey Cycle Management Modal (Mounted and wired) */}
			<PeriodManagementModal
				isOpen={isPeriodModalOpen}
				onClose={() => setIsPeriodModalOpen(false)}
			/>
		</div>
	);
};
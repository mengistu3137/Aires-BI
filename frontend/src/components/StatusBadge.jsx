import React from "react";

export const StatusBadge = ({ status }) => {
	switch (status) {
		case "COMPLETED":
			return (
				<span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-[#017C4D] border border-emerald-200">
					Completed
				</span>
			);
		case "IN_PROGRESS":
			return (
				<span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
					In Progress
				</span>
			);
		case "NOT_STARTED":
			return (
				<span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
					Not Started
				</span>
			);
		case "SYNCED":
			return (
				<span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-[#017C4D]">
					<span className="h-1.5 w-1.5 rounded-full bg-[#017C4D]" />
					Synced
				</span>
			);
		case "PENDING":
			return (
				<span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-[#FE7914]">
					<span className="h-1.5 w-1.5 rounded-full bg-[#FE7914] animate-pulse" />
					Pending Sync
				</span>
			);
		case "FAILED":
			return (
				<span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-[#A41821]">
					<span className="h-1.5 w-1.5 rounded-full bg-[#A41821]" />
					Sync Failed
				</span>
			);
		default:
			return (
				<span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
					{status}
				</span>
			);
	}
};
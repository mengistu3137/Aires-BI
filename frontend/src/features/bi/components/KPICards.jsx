import React from "react";

export const KPICards = ({ summary }) => {
	if (!summary) return null;

	const isOnTarget = summary.status === "ON_TARGET";

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			{/* 1. Overall Price Index vs Target */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
						Overall Price Index
					</span>
					<span
						className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
							isOnTarget
								? "bg-emerald-50 text-[#017C4D] border border-emerald-200"
								: "bg-red-50 text-[#A41821] border border-red-200"
						}`}
					>
						{isOnTarget ? "On Target" : "Review Needed"}
					</span>
				</div>
				<div className="flex items-baseline gap-2 mt-2">
					<span className="text-3xl font-black text-slate-900 tracking-tight">
						{summary.overallPriceIndexPercent}%
					</span>
					<span className="text-xs font-semibold text-slate-400">
						/ Target: {summary.targetIndexPercent}%
					</span>
				</div>
				<p className="text-[11px] text-slate-500 mt-1">
					{summary.overallPriceIndex <= summary.targetIndex
						? "Competitive pricing target achieved"
						: "Queens pricing exceeds target benchmark"}
				</p>
			</div>

			{/* 2. Price Down Actions (Overpriced vs Cheapest) */}
			<div className="rounded-2xl border border-red-100 bg-red-50/40 p-5 shadow-xs">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[#A41821] uppercase tracking-wider">
						Price Down Actions
					</span>
					<span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-white text-xs font-bold">
						↓
					</span>
				</div>
				<div className="mt-2">
					<span className="text-3xl font-black text-[#A41821]">
						{summary.priceDownCount}
					</span>
					<span className="text-xs font-medium text-slate-500 ml-2">items</span>
				</div>
				<p className="text-[11px] text-slate-500 mt-1">
					Over 5% higher than cheapest competitor
				</p>
			</div>

			{/* 3. Price Up Actions (Underpriced) */}
			<div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-5 shadow-xs">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-[#017C4D] uppercase tracking-wider">
						Price Up Actions
					</span>
					<span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#017C4D] text-white text-xs font-bold">
						↑
					</span>
				</div>
				<div className="mt-2">
					<span className="text-3xl font-black text-[#017C4D]">
						{summary.priceUpCount}
					</span>
					<span className="text-xs font-medium text-slate-500 ml-2">items</span>
				</div>
				<p className="text-[11px] text-slate-500 mt-1">
					Margin recovery opportunity (Queens &lt; 95%)
				</p>
			</div>

			{/* 4. Audit Coverage */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
				<div className="flex items-center justify-between">
					<span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
						Audit Coverage
					</span>
					<span className="text-xs font-bold text-slate-400">
						{summary.keepCount} Kept
					</span>
				</div>
				<div className="mt-2 flex items-baseline gap-1.5">
					<span className="text-3xl font-black text-slate-900">
						{summary.surveyedItems}
					</span>
					<span className="text-sm font-bold text-slate-400">
						/ {summary.totalItems} Items
					</span>
				</div>
				<p className="text-[11px] text-slate-500 mt-1">
					{summary.pendingCount > 0
						? `${summary.pendingCount} items pending field audit`
						: "Complete audit dataset collected"}
				</p>
			</div>
		</div>
	);
};
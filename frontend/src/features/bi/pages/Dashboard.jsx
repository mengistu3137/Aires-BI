import React, { useState } from "react";
import { useBIDashboard } from "../hooks/useBIDashboard.js";

import { KPICards } from "../components/KPICards.jsx";
import { CategoryIndexList } from "../components/CategoryIndexList.jsx";
import { AlertsBanner } from "../components/AlertsBanner.jsx";
import { PriceActionBadge } from "@/components/PriceActionBadge.jsx";
import { DataTable } from "@/components/DataTable.jsx";
import { Can } from "@/components/Can.jsx";
import toast from "react-hot-toast";

export const Dashboard = () => {
	const [periodId] = useState("2026-W39");
	const [selectedCategory, setSelectedCategory] = useState("ALL");
	const { data, isLoading } = useBIDashboard(periodId, 0.95);

	const handleExport = () => {
		if (!data?.biResults?.length) {
			toast.error("No BI results available to export");
			return;
		}
		downloadBIExcelExport(data.biResults, periodId);
		toast.success("Excel report exported successfully");
	};

	if (isLoading) {
		return (
			<div className="flex h-96 items-center justify-center">
				<div className="flex flex-col items-center gap-2">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
					<p className="text-xs font-semibold text-slate-500">
						Calculating BI Pricing Engine...
					</p>
				</div>
			</div>
		);
	}

	const { dashboardSummary, categorySummaries, biResults, alerts } = data || {};

	const filteredResults =
		selectedCategory === "ALL"
			? biResults || []
			: (biResults || []).filter((r) => r.category === selectedCategory);

	const categories = [
		"ALL",
		"Fresh",
		"Ultra-Sensitive",
		"Sensitive",
		"Non-Sensitive",
		"Dry",
	];

	// Column definitions for the interactive DataTable
	const tableColumns = [
		{
			header: "Product Item",
			key: "itemName",
			sortable: true,
			render: (row) => (
				<div>
					<span className="font-bold text-slate-900">{row.itemName}</span>
					<span className="block text-[10px] font-mono text-slate-400">
						[{row.itemId}]
					</span>
				</div>
			),
		},
		{
			header: "Category",
			key: "category",
			sortable: true,
			render: (row) => (
				<span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
					{row.category}
				</span>
			),
		},
		{
			header: "Queens Price",
			key: "queensPrice",
			sortable: true,
			render: (row) => (
				<span className="font-mono font-bold text-slate-900">
					{row.queensPrice.toFixed(2)} ETB
				</span>
			),
		},
		{
			header: "Cheapest Competitor",
			key: "cheapestCompetitor",
			render: (row) =>
				row.cheapestCompetitor ? (
					<div>
						<span className="font-medium text-slate-800">
							{row.cheapestCompetitor.competitorName}
						</span>
						<span className="block text-[10px] font-mono text-slate-500">
							Avg: {row.cheapestCompetitor.averagePrice.toFixed(2)} ETB
						</span>
					</div>
				) : (
					<span className="text-slate-400 italic">No samples</span>
				),
		},
		{
			header: "Price Index",
			key: "priceIndex",
			sortable: true,
			render: (row) =>
				row.hasData ? (
					<div className="font-mono">
						<span className="font-extrabold text-slate-900">
							{row.priceIndexPercent}%
						</span>
						<span className="text-[10px] text-slate-400 ml-1">
							({row.priceIndex})
						</span>
					</div>
				) : (
					<span className="text-slate-400">—</span>
				),
		},
		{
			header: "Action Recommendation",
			key: "action",
			align: "right",
			render: (row) => (
				<PriceActionBadge
					action={row.action}
					variancePercent={row.variancePercent}
				/>
			),
		},
	];

	return (
		<div className="mx-auto max-w-7xl space-y-6 pb-12">
			{/* Top Header */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-black text-slate-900 tracking-tight">
							BI Competitor Pricing Intelligence
						</h1>
						<span className="rounded-sm bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
							{periodId}
						</span>
					</div>
					<p className="text-xs text-slate-500 mt-0.5">
						Automated competitor price averaging, benchmark indexing, and price
						action engine
					</p>
				</div>

				{/* Export Data Button (Guarded by Permission) */}
				<Can permission="EXPORT_DATA">
					<button
						type="button"
						onClick={handleExport}
						className="inline-flex items-center gap-2 rounded-xl bg-[#017C4D] hover:bg-[#015E3A] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95"
					>
						<svg
							className="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						Export Flat Excel
					</button>
				</Can>
			</div>

			{/* KPI Cards */}
			<KPICards summary={dashboardSummary} />

			{/* Alerts */}
			<AlertsBanner alerts={alerts} />

			{/* Middle Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-1">
					<CategoryIndexList
						categories={categorySummaries}
						targetPercent={dashboardSummary?.targetIndexPercent || 95}
					/>
				</div>

				<div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
					<div>
						<h3 className="text-sm font-bold text-slate-900">
							Pricing Action Logic & Decision Rules
						</h3>
						<p className="text-xs text-slate-500 mt-1">
							Index formula:{" "}
							<code className="rounded bg-slate-100 px-1 py-0.5 font-bold text-slate-800">
								Index = Queens Price / Cheapest Competitor Average
							</code>
						</p>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
							<span className="text-xs font-bold text-[#A41821]">
								PRICE DOWN (&gt; 1.05)
							</span>
							<p className="text-[11px] text-slate-600 mt-1">
								Queens price is over 5% more expensive than cheapest competitor.
								Price reduction recommended.
							</p>
						</div>
						<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
							<span className="text-xs font-bold text-slate-700">
								KEEP (0.95 – 1.05)
							</span>
							<p className="text-[11px] text-slate-600 mt-1">
								Queens price is within competitive tolerance range (±5%).
								Maintain current pricing.
							</p>
						</div>
						<div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
							<span className="text-xs font-bold text-[#017C4D]">
								PRICE UP (&lt; 0.95)
							</span>
							<p className="text-[11px] text-slate-600 mt-1">
								Queens price is over 5% cheaper than cheapest competitor. Margin
								recovery opportunity.
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Category Filter Pills & Interactive DataTable */}
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-bold text-slate-900">
						Competitor Benchmark Table ({filteredResults.length})
					</h2>

					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
						{categories.map((cat) => (
							<button
								key={cat}
								type="button"
								onClick={() => setSelectedCategory(cat)}
								className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
									selectedCategory === cat
										? "bg-[#A41821] text-white"
										: "bg-slate-100 text-slate-600 hover:bg-slate-200"
								}`}
							>
								{cat}
							</button>
						))}
					</div>
				</div>

				<DataTable
					columns={tableColumns}
					data={filteredResults}
					searchKey="itemName"
					searchPlaceholder="Search product by name or ID..."
					pageSize={8}
					emptyMessage="No product benchmarks match your filter."
				/>
			</div>
		</div>
	);
};
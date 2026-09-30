import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { usePriceAnalyses } from "../hooks/usePriceAnalyses.js";
import { useRecalculateSurveyPeriod } from "../hooks/usePriceAnalysisMutations.js";
import { useAuth } from "@/hooks/useAuth.js";
import { SurveyPeriodSelector } from "@/features/survey/components/SurveyPeriodSelector.jsx";
import { ActionFilter } from "../components/ActionFilter.jsx";
import { PriceAnalysisListTable } from "../components/PriceAnalysisListTable.jsx";
import { PriceAnalysisMobileList } from "../components/PriceAnalysisMobileList.jsx";
import { PriceAnalysisEmptyState } from "../components/PriceAnalysisEmptyState.jsx";
import { PriceAnalysisSummaryBar } from "../components/PriceAnalysisSummaryBar.jsx";
import { RecalculateConfirmModal } from "../components/RecalculateConfirmModal.jsx";
import { exportPriceAnalysisExcelRequest } from "@/services/api/price-analysis.api.js";
import { RapidPriceAdjustmentDrawer } from "../components/RapidPriceAdjustmentDrawer.jsx";

export const PriceAnalysisPage = () => {
	const navigate = useNavigate();
	const { isManager } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();

	const [search, setSearch] = useState("");
	const [showRecalcModal, setShowRecalcModal] = useState(false);
	const [showRapidDrawer, setShowRapidDrawer] = useState(false);
	const [recalcSummary, setRecalcSummary] = useState(null);
	const [isExporting, setIsExporting] = useState(false);

	const surveyPeriodId = searchParams.get("surveyPeriodId") || "";
	const action = searchParams.get("action") || "";
	const asOfDate = searchParams.get("asOfDate") || "";
	const page = Number(searchParams.get("page") || 1);

	const setFilter = (key, value) => {
		const next = new URLSearchParams(searchParams);
		if (value === "" || value === null || value === undefined) {
			next.delete(key);
		} else {
			next.set(key, value);
		}
		if (key !== "page") next.set("page", "1");
		setSearchParams(next, { replace: true });
	};

	const filters = useMemo(
		() => ({
			page,
			limit: 100,
			surveyPeriodId: surveyPeriodId || undefined,
			action: action || undefined,
			asOfDate: asOfDate || undefined,
		}),
		[page, surveyPeriodId, action, asOfDate],
	);

	const { data, isLoading, isError, error, refetch } =
		usePriceAnalyses(filters);

	const analyses = data?.analyses || [];
	const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

	const visibleAnalyses = useMemo(() => {
		if (!search.trim()) return analyses;
		const term = search.toLowerCase();
		return analyses.filter((a) => {
			const name = a.product?.name?.toLowerCase() || "";
			const sku = a.product?.sku?.toLowerCase() || "";
			const category = a.product?.category?.toLowerCase() || "";
			return (
				name.includes(term) || sku.includes(term) || category.includes(term)
			);
		});
	}, [analyses, search]);

	const flaggedAnalyses = useMemo(() => {
		return analyses.filter(
			(a) => a.action === "PRICE_DOWN" || a.action === "PRICE_UP",
		);
	}, [analyses]);

	const recalcMutation = useRecalculateSurveyPeriod();

	const handleRecalculate = async (options) => {
		if (!surveyPeriodId) return;
		try {
			const response = await recalcMutation.mutateAsync({
				surveyPeriodId,
				...options,
			});
			const result = response?.data || {};

			const next = new URLSearchParams(searchParams);
			next.delete("action");
			next.set("page", "1");
			setSearchParams(next, { replace: true });

			setRecalcSummary({
				processed: result.processedCount ?? 0,
				failed: result.failedCount ?? 0,
				total: result.totalAssignedProducts ?? 0,
				errors: result.errors ?? [],
				at: Date.now(),
			});

			await refetch();
			setShowRecalcModal(false);
		} catch (err) {
			setShowRecalcModal(false);
			toast.error("Recalculation failed. Please try again.");
		}
	};

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const { blob, filename } = await exportPriceAnalysisExcelRequest({
				surveyPeriodId: surveyPeriodId || undefined,
			});

			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("Export ready");
		} catch (err) {
			toast.error(err?.message || "Failed to export");
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-lg font-black text-slate-800">Price analysis</h1>
					<p className="mt-0.5 text-xs text-slate-500">
						Compare Queens benchmark prices with competitor prices across survey
						periods.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{isManager && flaggedAnalyses.length > 0 && (
						<button
							type="button"
							onClick={() => setShowRapidDrawer(true)}
							className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3.5 py-2.5 text-xs font-bold text-[#A41821] hover:bg-red-100/70 transition shadow-2xs active:scale-95"
						>
							<span>⚡ Rapid Adjust ({flaggedAnalyses.length})</span>
						</button>
					)}

					{isManager && (
						<button
							type="button"
							onClick={handleExport}
							disabled={isExporting}
							className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
							{isExporting ? "Exporting..." : "Export to Excel"}
						</button>
					)}

					{isManager && surveyPeriodId && (
						<button
							type="button"
							onClick={() => setShowRecalcModal(true)}
							className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#7F1219] active:scale-95"
						>
							Recalculate analysis
						</button>
					)}
				</div>
			</div>

			{/* Filters Grid */}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<SurveyPeriodSelector
					value={surveyPeriodId}
					onChange={(val) => setFilter("surveyPeriodId", val)}
				/>

				{/* Daily Date Scope Filter */}
				<div>
					<label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
						Analysis Date Filter (Optional)
					</label>
					<div className="mt-1.5 flex items-center gap-1.5">
						<input
							type="date"
							value={asOfDate}
							onChange={(e) => setFilter("asOfDate", e.target.value)}
							className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden"
						/>
						{asOfDate && (
							<button
								type="button"
								onClick={() => setFilter("asOfDate", "")}
								className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
								title="Clear date"
							>
								Clear
							</button>
						)}
					</div>
				</div>

				{/* Search */}
				<div>
					<label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
						Search
					</label>
					<div className="relative mt-1.5">
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search products by name or SKU"
							className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
						/>
						<svg
							className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
				</div>
			</div>

			{/* Recalc Summary Banner */}
			{recalcSummary && (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<p className="text-xs font-bold text-[#017C4D]">
								Recalculation complete
							</p>
							<p className="mt-0.5 text-[11px] text-emerald-700">
								{recalcSummary.processed} of {recalcSummary.total} products
								analyzed
								{recalcSummary.failed > 0 &&
									` · ${recalcSummary.failed} skipped`}
								.
							</p>
						</div>
						<button
							type="button"
							onClick={() => setRecalcSummary(null)}
							className="shrink-0 rounded-lg p-1 text-emerald-600 hover:bg-emerald-100"
						>
							✕
						</button>
					</div>
				</div>
			)}

			{/* Action Filter Pills */}
			<ActionFilter
				value={action}
				onChange={(val) => setFilter("action", val)}
			/>

			{/* Summary */}
			{!isLoading && !isError && analyses.length > 0 && (
				<PriceAnalysisSummaryBar analyses={analyses} meta={meta} />
			)}

			{/* Loading */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
				</div>
			)}

			{/* Content */}
			{!isLoading && !isError && (
				<>
					{visibleAnalyses.length === 0 ? (
						<PriceAnalysisEmptyState
							title={
								surveyPeriodId || action || search || asOfDate
									? "No price analysis matches your filters"
									: "No price analysis available"
							}
							description="Select a survey period and recalculate to generate analyses."
						/>
					) : (
						<>
							<div className="hidden md:block">
								<PriceAnalysisListTable analyses={visibleAnalyses} />
							</div>
							<div className="md:hidden">
								<PriceAnalysisMobileList analyses={visibleAnalyses} />
							</div>
						</>
					)}
				</>
			)}

			{/* Recalculate Modal with Category Streams & Date */}
			<RecalculateConfirmModal
				isOpen={showRecalcModal}
				onCancel={() => setShowRecalcModal(false)}
				onConfirm={handleRecalculate}
				isPending={recalcMutation.isPending}
				surveyPeriodName={analyses[0]?.surveyPeriod?.name}
			/>

			{/* High-Speed Rapid Benchmark Price Adjustment Drawer */}
			<RapidPriceAdjustmentDrawer
				isOpen={showRapidDrawer}
				onClose={() => setShowRapidDrawer(false)}
				analyses={flaggedAnalyses}
			/>
		</div>
	);
};
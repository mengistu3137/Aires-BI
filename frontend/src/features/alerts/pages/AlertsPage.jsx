import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAlerts } from "../hooks/useAlerts.js";
import { useGenerateAlertsForSurveyPeriod } from "../hooks/useAlertMutations.js";
import { useAuth } from "@/hooks/useAuth.js";
import { AlertFilters } from "../components/AlertFilters.jsx";
import { AlertListTable } from "../components/AlertListTable.jsx";
import { AlertMobileList } from "../components/AlertMobileList.jsx";
import { AlertEmptyState } from "../components/AlertEmptyState.jsx";
import { AlertSummaryBar } from "../components/AlertSummaryBar.jsx";
import { RapidPriceAdjustmentDrawer } from "@/features/price-analysis/components/RapidPriceAdjustmentDrawer.jsx";
import toast from "react-hot-toast";

const PAGE_SIZE = 20;

export const AlertsPage = () => {
	const navigate = useNavigate();
	const { isManager } = useAuth();
	const [searchParams, setSearchParams] = useSearchParams();

	const [search, setSearch] = useState("");
	const [rapidAnalysis, setRapidAnalysis] = useState(null);

	// URL-driven filters
	const statusFilter = searchParams.get("resolved") || "";
	const severityFilter = searchParams.get("severity") || "";
	const typeFilter = searchParams.get("type") || "";
	const surveyPeriodId = searchParams.get("surveyPeriodId") || "";
	const page = Math.max(1, Number(searchParams.get("page") || 1));

	const setFilter = (key, value) => {
		const next = new URLSearchParams(searchParams);
		if (value === "" || value === null || value === undefined) {
			next.delete(key);
		} else {
			next.set(key, value);
		}
		if (key !== "page") next.delete("page");
		setSearchParams(next, { replace: true });
	};

	const setPage = (next) => {
		const nextParams = new URLSearchParams(searchParams);
		if (next <= 1) nextParams.delete("page");
		else nextParams.set("page", String(next));
		setSearchParams(nextParams, { replace: true });
	};

	const filters = useMemo(
		() => ({
			page,
			limit: PAGE_SIZE,
			resolved: statusFilter || undefined,
			severity: severityFilter || undefined,
			type: typeFilter || undefined,
			surveyPeriodId: surveyPeriodId || undefined,
		}),
		[page, statusFilter, severityFilter, typeFilter, surveyPeriodId],
	);

	const { data, isLoading, isError, error, isFetching } = useAlerts(filters);

	const alerts = data?.alerts || [];
	const meta = data?.meta || {
		page: 1,
		limit: PAGE_SIZE,
		total: 0,
		totalPages: 1,
	};

	const generateAlerts = useGenerateAlertsForSurveyPeriod();

	const handleGenerate = async () => {
		if (!surveyPeriodId) {
			toast.error(
				"Pick a survey period first (?surveyPeriodId=... in the URL)",
			);
			return;
		}
		try {
			await generateAlerts.mutateAsync({ surveyPeriodId });
		} catch (err) {
			toast.error(err?.message || "Failed to generate alerts");
		}
	};

	// Build a Rapid-Adjust-compatible analysis object from an alert
	const buildAnalysisFromAlert = (alert) => {
		if (!alert?.analysisId || alert.recommendedPrice == null) return null;
		return {
			id: alert.analysisId,
			productId: alert.productId,
			surveyPeriodId: alert.surveyPeriodId,
			queensPrice: alert.queensPrice,
			competitorAveragePrice: alert.competitorAveragePrice,
			minimumCompetitorPrice: alert.minimumCompetitorPrice,
			priceIndex: alert.priceIndex,
			targetIndex: alert.targetIndex,
			recommendedPrice: alert.recommendedPrice,
			action: alert.analysisAction || alert.type,
			notes: alert.analysisNotes || null,
			product: alert.product,
		};
	};

	const handleRowClick = (alert) => {
		if (alert.resolved) {
			// Resolved alerts → go to the detail page (no action to take)
			navigate(`/alerts/${alert.id}`);
			return;
		}

		const analysis = buildAnalysisFromAlert(alert);
		if (!analysis) {
			// No linked analysis (or no recommended price) → fall back to detail page
			navigate(`/alerts/${alert.id}`);
			return;
		}
		setRapidAnalysis(analysis);
	};

	// Client-side search across loaded page
	const visibleAlerts = useMemo(() => {
		if (!search.trim()) return alerts;
		const term = search.toLowerCase();
		return alerts.filter((a) => {
			const name = a.product?.name?.toLowerCase() || "";
			const message = a.message?.toLowerCase() || "";
			const sku = a.product?.sku?.toLowerCase() || "";
			return (
				name.includes(term) || message.includes(term) || sku.includes(term)
			);
		});
	}, [alerts, search]);

	const hasActiveFilters = Boolean(
		statusFilter || severityFilter || typeFilter || search || surveyPeriodId,
	);

	const handleClearFilters = () => {
		setSearch("");
		const next = new URLSearchParams();
		if (surveyPeriodId) next.set("surveyPeriodId", surveyPeriodId);
		setSearchParams(next, { replace: true });
	};

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-lg font-black text-slate-800">Alerts</h1>
					<p className="mt-0.5 text-xs text-slate-500">
						Click any open alert to fix the price inline — no page navigation.
					</p>
				</div>

				{isManager && surveyPeriodId && (
					<button
						type="button"
						onClick={handleGenerate}
						disabled={generateAlerts.isPending}
						className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
					>
						{generateAlerts.isPending ? "Generating…" : "Regenerate alerts"}
					</button>
				)}
			</div>

			{/* Filters */}
			<AlertFilters
				search={search}
				onSearchChange={setSearch}
				statusFilter={statusFilter}
				onStatusFilterChange={(val) => setFilter("resolved", val)}
				severityFilter={severityFilter}
				onSeverityFilterChange={(val) => setFilter("severity", val)}
				typeFilter={typeFilter}
				onTypeFilterChange={(val) => setFilter("type", val)}
			/>

			{/* Active filter chips */}
			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-1.5">
					<span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
						Active:
					</span>
					{surveyPeriodId && (
						<FilterChip
							label={`Period: ${surveyPeriodId}`}
							onRemove={() => setFilter("surveyPeriodId", "")}
						/>
					)}
					{statusFilter && (
						<FilterChip
							label={`Status: ${statusFilter === "true" ? "Resolved" : "Unresolved"}`}
							onRemove={() => setFilter("resolved", "")}
						/>
					)}
					{severityFilter && (
						<FilterChip
							label={`Severity: ${prettyEnum(severityFilter)}`}
							onRemove={() => setFilter("severity", "")}
						/>
					)}
					{typeFilter && (
						<FilterChip
							label={`Type: ${prettyEnum(typeFilter)}`}
							onRemove={() => setFilter("type", "")}
						/>
					)}
					{search.trim() && (
						<FilterChip
							label={`Search: "${search.trim()}"`}
							onRemove={() => setSearch("")}
						/>
					)}
					<button
						type="button"
						onClick={handleClearFilters}
						className="ml-1 text-[11px] font-bold text-[#A41821] hover:underline"
					>
						Clear all
					</button>
				</div>
			)}

			{/* Summary */}
			{!isLoading && !isError && alerts.length > 0 && (
				<AlertSummaryBar alerts={alerts} meta={meta} />
			)}

			{/* Loading */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
				</div>
			)}

			{/* Error */}
			{isError && (
				<div className="rounded-2xl border border-red-200 bg-red-50 p-4">
					<p className="text-xs font-medium text-[#A41821]">
						{error?.message || "Unable to load alerts"}
					</p>
				</div>
			)}

			{/* Content */}
			{!isLoading && !isError && (
				<>
					{visibleAlerts.length === 0 ? (
						hasActiveFilters ? (
							<AlertEmptyState
								title="No alerts match your filters"
								description="Try adjusting or clearing the current filters."
								action={
									<button
										type="button"
										onClick={handleClearFilters}
										className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
									>
										Clear filters
									</button>
								}
							/>
						) : (
							<AlertEmptyState
								title="No alerts found"
								description="Alerts appear here when the backend identifies a pricing action requiring attention."
							/>
						)
					) : (
						<>
							<div className="hidden md:block">
								<AlertListTable
									alerts={visibleAlerts}
									onRowClick={handleRowClick}
								/>
							</div>
							<div className="md:hidden">
								<AlertMobileList
									alerts={visibleAlerts}
									onRowClick={handleRowClick}
								/>
							</div>
						</>
					)}

					{/* Pagination footer */}
					{meta.totalPages > 1 && (
						<div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs sm:flex-row">
							<p className="text-[11px] font-semibold text-slate-500">
								Page{" "}
								<span className="font-mono font-bold text-slate-700">
									{meta.page}
								</span>{" "}
								of{" "}
								<span className="font-mono font-bold text-slate-700">
									{meta.totalPages}
								</span>{" "}
								·{" "}
								<span className="font-mono font-bold text-slate-700">
									{meta.total}
								</span>{" "}
								total alerts
							</p>

							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={() => setPage(1)}
									disabled={meta.page <= 1 || isFetching}
									className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
								>
									«
								</button>
								<button
									type="button"
									onClick={() => setPage(meta.page - 1)}
									disabled={meta.page <= 1 || isFetching}
									className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
								>
									Previous
								</button>
								{(() => {
									const total = meta.totalPages;
									const current = meta.page;
									const span = 2;
									const start = Math.max(1, current - span);
									const end = Math.min(total, current + span);
									const nums = [];
									for (let i = start; i <= end; i += 1) nums.push(i);
									return nums.map((num) => {
										const active = num === current;
										return (
											<button
												key={num}
												type="button"
												onClick={() => setPage(num)}
												disabled={isFetching}
												className={`min-w-[32px] rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
													active
														? "border-[#A41821] bg-[#A41821] text-white shadow-xs"
														: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
												} disabled:cursor-not-allowed disabled:opacity-40`}
											>
												{num}
											</button>
										);
									});
								})()}
								<button
									type="button"
									onClick={() => setPage(meta.page + 1)}
									disabled={meta.page >= meta.totalPages || isFetching}
									className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
								>
									Next
								</button>
								<button
									type="button"
									onClick={() => setPage(meta.totalPages)}
									disabled={meta.page >= meta.totalPages || isFetching}
									className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
								>
									»
								</button>
							</div>
						</div>
					)}
				</>
			)}

			{/* Rapid Adjust drawer — opens inline on row click */}
			<RapidPriceAdjustmentDrawer
				isOpen={Boolean(rapidAnalysis)}
				onClose={() => setRapidAnalysis(null)}
				analyses={rapidAnalysis ? [rapidAnalysis] : []}
			/>
		</div>
	);
};

const FilterChip = ({ label, onRemove }) => (
	<span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
		{label}
		<button
			type="button"
			onClick={onRemove}
			className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
			aria-label={`Remove ${label}`}
		>
			✕
		</button>
	</span>
);

const prettyEnum = (value) => {
	if (!value) return "";
	return value
		.toLowerCase()
		.split("_")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
};
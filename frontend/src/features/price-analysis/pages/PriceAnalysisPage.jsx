import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePriceAnalyses } from "../hooks/usePriceAnalyses.js";
import { useRecalculateSurveyPeriod } from "../hooks/usePriceAnalysisMutations.js";
import { useAuth } from "@/hooks/useAuth.js";
import { SurveyPeriodSelector } from "../components/SurveyPeriodSelector.jsx";
import { ActionFilter } from "../components/ActionFilter.jsx";
import { PriceAnalysisListTable } from "../components/PriceAnalysisListTable.jsx";
import { PriceAnalysisMobileList } from "../components/PriceAnalysisMobileList.jsx";
import { PriceAnalysisEmptyState } from "../components/PriceAnalysisEmptyState.jsx";
import { PriceAnalysisSummaryBar } from "../components/PriceAnalysisSummaryBar.jsx";
import { RecalculateConfirmModal } from "../components/RecalculateConfirmModal.jsx";

export const PriceAnalysisPage = () => {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [showRecalcModal, setShowRecalcModal] = useState(false);

  // URL-driven filters
  const surveyPeriodId = searchParams.get("surveyPeriodId") || "";
  const action = searchParams.get("action") || "";
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
      limit: 20,
      surveyPeriodId: surveyPeriodId || undefined,
      action: action || undefined,
    }),
    [page, surveyPeriodId, action]
  );

  const { data, isLoading, isError, error } = usePriceAnalyses(filters);

  const analyses = data?.analyses || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  // Client-side search across loaded page
  const visibleAnalyses = useMemo(() => {
    if (!search.trim()) return analyses;
    const term = search.toLowerCase();
    return analyses.filter((a) => {
      const name = a.product?.name?.toLowerCase() || "";
      const sku = a.product?.sku?.toLowerCase() || "";
      const category = a.product?.category?.toLowerCase() || "";
      return name.includes(term) || sku.includes(term) || category.includes(term);
    });
  }, [analyses, search]);

  const recalcMutation = useRecalculateSurveyPeriod();

  const handleRecalculate = async () => {
    if (!surveyPeriodId) return;
    try {
      await recalcMutation.mutateAsync({ surveyPeriodId });
      setShowRecalcModal(false);
    } catch (err) {
      // Error toast handled globally
      setShowRecalcModal(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800">Price analysis</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Compare Queens benchmark prices with competitor prices across survey periods.
          </p>
        </div>
        {isManager && surveyPeriodId && (
          <button
            type="button"
            onClick={() => setShowRecalcModal(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Recalculate analysis
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SurveyPeriodSelector
          value={surveyPeriodId}
          onChange={(val) => setFilter("surveyPeriodId", val)}
        />
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Search
          </label>
          <div className="relative mt-1.5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
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

      {/* Action filter pills */}
      <ActionFilter value={action} onChange={(val) => setFilter("action", val)} />

      {/* Page summary */}
      {!isLoading && !isError && analyses.length > 0 && (
        <PriceAnalysisSummaryBar analyses={analyses} meta={meta} />
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
            {error?.message || "Unable to load price analysis"}
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {visibleAnalyses.length === 0 ? (
            <PriceAnalysisEmptyState
              title={
                surveyPeriodId || action || search
                  ? "No price analysis matches your filters"
                  : "No price analysis available"
              }
              description={
                surveyPeriodId
                  ? "Try selecting a different survey period or adjusting filters."
                  : "Price analysis is calculated by the backend using approved competitor observations and Queens benchmark prices."
              }
              action={
                surveyPeriodId ? null : (
                  <button
                    type="button"
                    onClick={() => navigate("/queens-prices")}
                    className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219]"
                  >
                    Manage Queens prices
                  </button>
                )
              }
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

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setFilter("page", String(Math.max(1, page - 1)))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setFilter("page", String(page + 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <RecalculateConfirmModal
        isOpen={showRecalcModal}
        onCancel={() => setShowRecalcModal(false)}
        onConfirm={handleRecalculate}
        isPending={recalcMutation.isPending}
      />
    </div>
  );
};

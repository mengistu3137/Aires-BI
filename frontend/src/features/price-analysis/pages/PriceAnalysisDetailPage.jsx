import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePriceAnalysis } from "../hooks/usePriceAnalysis.js";
import { useAuth } from "@/hooks/useAuth.js";
import { PriceAnalysisActionBadge } from "../components/PriceAnalysisActionBadge.jsx";
import { PriceAnalysisComparison } from "../components/PriceAnalysisComparison.jsx";
import { PriceAnalysisMetrics } from "../components/PriceAnalysisMetrics.jsx";
import { PriceAnalysisNotes } from "../components/PriceAnalysisNotes.jsx";
import { PriceAnalysisRelatedAlerts } from "../components/PriceAnalysisRelatedAlerts.jsx";
import { formatDateTime, formatIndex, formatPrice } from "../utils/price-analysis.utils.js";

export const PriceAnalysisDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();

  const { data: analysis, isLoading, isError, error } = usePriceAnalysis(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !analysis) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">
          {error?.message || "Price analysis not found"}
        </p>
        <button
          type="button"
          onClick={() => navigate("/price-analysis")}
          className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
        >
          Back to price analysis
        </button>
      </div>
    );
  }

  const productId = analysis.productId;
  const surveyPeriodId = analysis.surveyPeriodId;

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header: product + survey period + action */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-slate-800">
              {analysis.product?.name || "Unknown product"}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {analysis.product?.category}
              {analysis.product?.sku && ` · SKU ${analysis.product.sku}`}
            </p>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              Survey period: {analysis.surveyPeriod?.name || "—"}
            </p>
          </div>
          <PriceAnalysisActionBadge action={analysis.action} size="md" />
        </div>

        {/* Benchmark summary */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile label="Queens price" value={formatPrice(analysis.queensPrice)} />
          <MetricTile
            label="Avg. competitor"
            value={formatPrice(analysis.competitorAveragePrice)}
          />
          <MetricTile label="Price index" value={formatIndex(analysis.priceIndex)} />
          <MetricTile label="Target index" value={formatIndex(analysis.targetIndex)} />
        </div>
      </div>

      {/* Price comparison visual */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Price comparison
        </h2>
        <div className="mt-3">
          <PriceAnalysisComparison
            queensPrice={analysis.queensPrice}
            minimumCompetitorPrice={analysis.minimumCompetitorPrice}
            competitorAveragePrice={analysis.competitorAveragePrice}
          />
        </div>
      </div>

      {/* Metrics table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Analysis</h2>
        <div className="mt-2">
          <PriceAnalysisMetrics analysis={analysis} />
        </div>
      </div>

      {/* Calculation metadata */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Calculation
        </h2>
        <dl className="mt-2 divide-y divide-slate-100">
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Calculated at
            </dt>
            <dd className="text-right text-xs font-semibold text-slate-700">
              {formatDateTime(analysis.calculatedAt)}
            </dd>
          </div>
        </dl>
        <PriceAnalysisNotes notes={analysis.notes} className="mt-3" />
      </div>

      {/* Related alerts */}
      <PriceAnalysisRelatedAlerts alerts={[]} />

      {/* Cross-module navigation */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Related</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate(`/products/${productId}/queens-prices`)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
            Queens price history
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(`/audits?surveyPeriodId=${surveyPeriodId}&productId=${productId}`)
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Observations
          </button>
          {isManager && (
            <button
              type="button"
              onClick={() => navigate("/alerts")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              Alerts
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricTile = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="mt-0.5 truncate text-sm font-black text-slate-800">{value}</p>
  </div>
);

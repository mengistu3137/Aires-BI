import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePriceAnalysis } from "../hooks/usePriceAnalysis.js";
import { useAuth } from "@/hooks/useAuth.js";
import { PriceAnalysisActionBadge } from "../components/PriceAnalysisActionBadge.jsx";
import { PriceAnalysisComparison } from "../components/PriceAnalysisComparison.jsx";
import { PriceAnalysisMetrics } from "../components/PriceAnalysisMetrics.jsx";
import { PriceAnalysisNotes } from "../components/PriceAnalysisNotes.jsx";
import { PriceAnalysisRelatedAlerts } from "../components/PriceAnalysisRelatedAlerts.jsx";
import {
  formatCapturedAt,
  formatDateTime,
  formatIndex,
  formatPrice,
} from "../utils/price-analysis.utils.js";
import { formatProductName } from "@/utils/formatters.js";

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
  const competitorPrices = analysis.competitorPrices || [];

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

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-slate-800">
              {formatProductName(analysis.product?.name) || "Unknown product"}
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
          <MetricTile
            label="Queens price"
            value={formatPrice(analysis.queensPrice)}
            tone="queens"
          />
          <MetricTile
            label="Min. competitor"
            value={formatPrice(analysis.minimumCompetitorPrice)}
          />
          <MetricTile
            label="Avg. competitor"
            value={formatPrice(analysis.competitorAveragePrice)}
          />
          <MetricTile label="Price index" value={formatIndex(analysis.priceIndex)} />
        </div>
      </div>

      {/* Competitor prices — new section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Competitor prices
          </h2>
          <span className="text-[10px] text-slate-400">
            {competitorPrices.length} approved observation
            {competitorPrices.length === 1 ? "" : "s"}
          </span>
        </div>

        {competitorPrices.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center">
            <p className="text-xs font-medium text-slate-500">
              No approved competitor prices are available for this product in the selected survey
              period.
            </p>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {competitorPrices.map((cp) => (
              <li key={cp.storeId} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {cp.storeName || "Unknown store"}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {cp.competitorName ? `${cp.competitorName}` : ""}
                    {cp.area ? ` · ${cp.area}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm font-black text-slate-800">
                    {formatPrice(cp.price)}
                  </p>
                  {cp.capturedAt && (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {formatCapturedAt(cp.capturedAt)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Legend */}
        <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
          Only observations approved by a supervisor are included in this analysis.
        </p>
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
          <div className="flex items-start justify-between gap-3 py-2.5">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Approved observations
            </dt>
            <dd className="text-right text-xs font-semibold text-slate-700">
              {competitorPrices.length}
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
            Queens price history
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(`/audits?surveyPeriodId=${surveyPeriodId}&productId=${productId}`)
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Observations
          </button>
          {isManager && (
            <button
              type="button"
              onClick={() => navigate("/alerts")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Alerts
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MetricTile = ({ label, value, tone }) => {
  const toneClasses =
    tone === "queens"
      ? "border-red-100 bg-red-50/60 text-[#A41821]"
      : "border-slate-100 bg-slate-50/50 text-slate-800";

  return (
    <div className={`rounded-xl border px-3 py-2 ${toneClasses}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black">{value}</p>
    </div>
  );
};

import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate, formatIndex, formatPrice } from "../utils/price-analysis.utils.js";
import { PriceAnalysisActionBadge } from "./PriceAnalysisActionBadge.jsx";
import { formatProductName } from "@/utils/formatters.js";

/**
 * Desktop table for price analysis records.
 */
export const PriceAnalysisListTable = ({ analyses = [] }) => {
  const navigate = useNavigate();

  if (analyses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <p className="text-xs font-medium text-slate-400">No price analysis matches your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Queens price</th>
              <th className="px-4 py-3 text-right">Min. competitor</th>
              <th className="px-4 py-3 text-right">Avg. competitor</th>
              <th className="px-4 py-3 text-right">Price index</th>
              <th className="px-4 py-3 text-right">Target index</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Calculated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {analyses.map((analysis) => (
              <tr
                key={analysis.id}
                className="cursor-pointer transition hover:bg-slate-50/75"
                onClick={() => navigate(`/price-analysis/${analysis.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-800">
                    {formatProductName(analysis.product?.name) || "—"}
                  </div>
                  {analysis.product?.sku && (
                    <div className="text-[10px] text-slate-400">SKU {analysis.product.sku}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">
                  {formatPrice(analysis.queensPrice)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatPrice(analysis.minimumCompetitorPrice)}
                </td>
                <td className="px-4 py-3 text-right text-slate-600">
                  {formatPrice(analysis.competitorAveragePrice)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">
                  {formatIndex(analysis.priceIndex)}
                </td>
                <td className="px-4 py-3 text-right text-slate-500">
                  {formatIndex(analysis.targetIndex)}
                </td>
                <td className="px-4 py-3">
                  <PriceAnalysisActionBadge action={analysis.action} />
                </td>
                <td className="px-4 py-3 text-slate-500">{formatDate(analysis.calculatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

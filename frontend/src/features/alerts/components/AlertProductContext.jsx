import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "../utils/alert.utils.js";

/**
 * Product + survey period context block for an alert.
 */
export const AlertProductContext = ({ alert }) => {
  const navigate = useNavigate();
  const product = alert.product;
  const surveyPeriod = alert.surveyPeriod;

  if (!product && !surveyPeriod) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      {product && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Product</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{product.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {product.category}
            {product.sku && ` · SKU ${product.sku}`}
            {product.unit && ` · ${product.unit}`}
          </p>
          <button
            type="button"
            onClick={() => navigate(`/products/${product.id}/queens-prices`)}
            className="mt-2 text-[11px] font-bold text-[#A41821] hover:underline"
          >
            View Queens price history
          </button>
        </div>
      )}

      {surveyPeriod && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Survey period
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{surveyPeriod.name}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatDate(surveyPeriod.startDate)} → {formatDate(surveyPeriod.endDate)}
          </p>
          {surveyPeriod.status && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {surveyPeriod.status}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

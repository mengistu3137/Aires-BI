import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueensPrice } from "../hooks/useQueensPrice.js";
import {
  formatDate,
  formatDateRange,
  formatPrice,
  getQueensPriceStatus,
} from "../utils/queens-price.utils.js";
import { QueensPriceStatusBadge } from "../components/QueensPriceStatusBadge.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import { formatProductName } from "@/utils/formatters.js";

export const QueensPriceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const { data: queensPrice, isLoading, isError, error } = useQueensPrice(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !queensPrice) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">
          {error?.message || "Queens price not found"}
        </p>
        <button
          type="button"
          onClick={() => navigate("/queens-prices")}
          className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
        >
          Back to Queens prices
        </button>
      </div>
    );
  }

  const status = getQueensPriceStatus(queensPrice);

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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-slate-800">
              {formatProductName(queensPrice.product?.name) || "Unknown product"}
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {queensPrice.product?.category}
              {queensPrice.product?.sku && ` · SKU ${queensPrice.product.sku}`}
            </p>
          </div>
          <QueensPriceStatusBadge status={status} />
        </div>

        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Price</p>
          <p className="mt-1 text-2xl font-black text-slate-800">
            {formatPrice(queensPrice.price)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDateRange(queensPrice.effectiveFrom, queensPrice.effectiveTo)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {isManager && (
            <button
              type="button"
              onClick={() => navigate(`/queens-prices/${id}/edit`)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/products/${queensPrice.productId}/queens-prices`)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            View full history
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Effective from" value={formatDate(queensPrice.effectiveFrom)} />
          <DetailRow
            label="Effective to"
            value={queensPrice.effectiveTo ? formatDate(queensPrice.effectiveTo) : "Present"}
          />
          <DetailRow label="Source" value={queensPrice.source || "—"} />
          <DetailRow label="Notes" value={queensPrice.notes || "—"} />
          <DetailRow label="Created" value={formatDate(queensPrice.createdAt)} />
          <DetailRow label="Updated" value={formatDate(queensPrice.updatedAt)} />
        </dl>
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2.5">
    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
    <dd className="max-w-[60%] text-right text-xs font-semibold text-slate-700">{value}</dd>
  </div>
);

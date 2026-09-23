import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate, formatPrice, getQueensPriceStatus } from "../utils/queens-price.utils.js";
import { QueensPriceStatusBadge } from "./QueensPriceStatusBadge.jsx";

/**
 * Desktop table for Queens price records.
 * Uses project-consistent compact table styling.
 */
export const QueensPriceListTable = ({ prices = [] }) => {
  const navigate = useNavigate();

  if (prices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <p className="text-xs font-medium text-slate-400">No Queens prices match your filters</p>
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
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3">Effective from</th>
              <th className="px-4 py-3">Effective to</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {prices.map((price) => {
              const status = getQueensPriceStatus(price);
              return (
                <tr
                  key={price.id}
                  className="cursor-pointer transition hover:bg-slate-50/75"
                  onClick={() => navigate(`/queens-prices/${price.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-800">{price.product?.name || "—"}</div>
                    {price.product?.sku && (
                      <div className="text-[10px] text-slate-400">SKU {price.product.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{price.product?.category || "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">
                    {formatPrice(price.price)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(price.effectiveFrom)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {price.effectiveTo ? formatDate(price.effectiveTo) : "Present"}
                  </td>
                  <td className="px-4 py-3">
                    <QueensPriceStatusBadge status={status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{price.source || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

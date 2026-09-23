import React from "react";
import { QueensPriceListItem } from "./QueensPriceListItem.jsx";

/**
 * Mobile-optimized list of Queens prices.
 */
export const QueensPriceMobileList = ({ prices = [] }) => {
  if (prices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <p className="text-xs font-medium text-slate-400">No Queens prices match your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prices.map((price) => (
        <QueensPriceListItem key={price.id} price={price} />
      ))}
    </div>
  );
};

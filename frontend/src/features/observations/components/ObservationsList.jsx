import React, { useMemo, useState } from "react";
import { ObservationListItem } from "./ObservationListItem.jsx";
import { getLatestObservationForProduct } from "../utils/observation.utils.js";

export const ObservationsList = ({ products = [], observations = [], onSelectProduct }) => {
  const [search, setSearch] = useState("");

  const mergedItems = useMemo(() => {
    return products.map((product) => ({
      product,
      observation: getLatestObservationForProduct(observations, product.id),
    }));
  }, [products, observations]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return mergedItems;
    const term = search.toLowerCase();
    return mergedItems.filter(({ product }) => {
      return (
        product.name?.toLowerCase().includes(term) ||
        product.sku?.toLowerCase().includes(term) ||
        product.barcode?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term)
      );
    });
  }, [mergedItems, search]);

  return (
    <div>
      {products.length > 6 && (
        <div className="relative mb-3">
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
      )}

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
          <p className="text-xs font-medium text-slate-400">No products match your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(({ product, observation }) => (
            <ObservationListItem
              key={product.id}
              product={product}
              observation={observation}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";

/**
 * Searchable product selector.
 * Fetches products on demand and allows search by name/SKU/barcode.
 *
 * NOTE: This uses a generic /products endpoint. If your backend exposes
 * a different search endpoint, update the fetch function accordingly.
 */
const fetchProducts = async (search) => {
  const response = await apiClient.get("/products", {
    params: { search: search || undefined, limit: 20, active: true },
  });
  return response.data.data.products || response.data || [];
};

export const ProductSelector = ({
  value,
  onChange,
  disabled = false,
  error,
  lockedProduct = null,
}) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["products", "search", search],
    queryFn: () => fetchProducts(search),
    staleTime: 60 * 1000,
    enabled: open || search.length > 0,
  });
  const products = data?.data || data?.products || data || [];

  const selectedProduct = useMemo(() => {
    if (lockedProduct) return lockedProduct;
    if (!value) return null;
    return products.find((p) => p.id === value) || null;
  }, [products, value, lockedProduct]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (product) => {
    onChange(product.id);
    setSearch("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Product
      </label>

      {selectedProduct ? (
        <div
          className={`mt-1.5 flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
            disabled ? "border-slate-200 bg-slate-100" : "border-slate-200 bg-slate-50/70"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-800">{selectedProduct.name}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {selectedProduct.category}
              {selectedProduct.sku && ` · SKU ${selectedProduct.sku}`}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Clear product"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            disabled={disabled}
            placeholder="Search products by name, SKU, or barcode"
            className={`mt-1.5 w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 disabled:opacity-50 ${
              error
                ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]"
                : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]"
            }`}
          />

          {open && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {isLoading ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">Searching...</div>
              ) : products.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400">
                  No products found
                </div>
              ) : (
                products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className="flex w-full items-center justify-between gap-2 border-b border-slate-50 px-3 py-2.5 text-left transition last:border-0 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{product.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {product.category}
                        {product.sku && ` · SKU ${product.sku}`}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}

      {error && <p className="mt-1.5 text-xs font-medium text-[#A41821]">{error}</p>}
    </div>
  );
};

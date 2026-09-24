import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";

/**
 * Universal extractor to handle any product payload wrapper
 */
const extractProduct = (item) => {
  if (!item) return null;
  if (item.product && typeof item.product === "object") return item.product;
  if (item.data && typeof item.data === "object" && !Array.isArray(item.data)) {
    return item.data.product || item.data;
  }
  return item;
};

const normalizeProductsList = (res) => {
  const body = res?.data;
  const list = body?.data?.products || body?.products || body?.data || body;
  return Array.isArray(list) ? list.map(extractProduct) : [];
};

const fetchProducts = async (searchTerm) => {
  const res = await apiClient.get("/products", {
    params: {
      search: searchTerm?.trim() || undefined,
      limit: 25,
      active: true,
    },
  });
  return normalizeProductsList(res);
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
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const { data: rawProducts = [], isLoading } = useQuery({
    queryKey: ["products", "selector", search],
    queryFn: () => fetchProducts(search),
    staleTime: 60 * 1000,
    enabled: open || search.length > 0 || Boolean(value && !lockedProduct),
  });

  const products = useMemo(() => rawProducts, [rawProducts]);

  // Authoritatively resolve selected product (locked or from query)
  const selectedProduct = useMemo(() => {
    const locked = extractProduct(lockedProduct);
    if (locked && (locked.name || locked.id)) return locked;
    if (!value) return null;
    const found = products.find((p) => p.id === value || p.sku === value);
    return extractProduct(found);
  }, [products, value, lockedProduct]);

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

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
    } else if (e.key === "Enter" && products[highlightedIndex]) {
      e.preventDefault();
      handleSelect(products[highlightedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const hasSku = Boolean(
    selectedProduct?.sku &&
    selectedProduct.sku.trim() !== "" &&
    selectedProduct.sku !== selectedProduct.name
  );

  return (
    <div ref={containerRef} className="relative">
      {selectedProduct ? (
        /* Clean Product Info Card (No disabled input appearance) */
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900 truncate">
                {selectedProduct.name || selectedProduct.id}
              </span>
              {selectedProduct.category && (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 font-mono">
                  {selectedProduct.category}
                </span>
              )}
            </div>

            {hasSku && (
              <p className="mt-1 text-[11px] font-mono text-slate-400">
                SKU: {selectedProduct.sku}
              </p>
            )}
          </div>

          {!disabled && !lockedProduct && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setSearch("");
                setOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="text-xs font-bold text-[#A41821] hover:underline cursor-pointer flex-none"
            >
              Change
            </button>
          )}
        </div>
      ) : (
        /* Autocomplete Search Input */
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Search product by name, brand, or SKU..."
            className={`w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 transition ${
              error
                ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]"
                : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]"
            }`}
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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

          {/* Autocomplete Dropdown */}
          {open && (
            <div className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-xl">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-5 text-xs text-slate-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#A41821] border-t-transparent" />
                  <span>Loading product catalog...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-500">
                  No products found matching "{search}"
                </div>
              ) : (
                products.map((productItem, idx) => (
                  <button
                    key={productItem.id}
                    type="button"
                    onClick={() => handleSelect(productItem)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition cursor-pointer ${
                      idx === highlightedIndex
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {productItem.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-mono text-slate-400">
                        {productItem.category}
                        {productItem.sku ? ` • SKU: ${productItem.sku}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-[#A41821]">Select →</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1.5 text-xs font-semibold text-[#A41821]">{error}</p>}
    </div>
  );
};
import React, { useState, useEffect, useRef, useMemo } from "react";
import { formatProductName } from "@/utils/formatters.js";

export const FastProductSearch = ({
  products = [],
  completedProductIds = new Set(),
  onSelectProduct,
  disabled = false,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return [];
    const cleanQuery = query.trim().toLowerCase();

    return products
      .filter((p) => {
        const nameMatch = (p.name || "").toLowerCase().includes(cleanQuery);
        const barcodeMatch = (p.barcode || "").toLowerCase().includes(cleanQuery);
        const skuMatch = (p.sku || "").toLowerCase().includes(cleanQuery);
        const idMatch = (p.productId || p.id || "").toLowerCase().includes(cleanQuery);
        return nameMatch || barcodeMatch || skuMatch || idMatch;
      })
      .slice(0, 8);
  }, [products, query]);

  useEffect(() => {
    if (!query.trim()) return;
    const clean = query.trim();

    const exactMatch = products.find(
      (p) =>
        p.barcode === clean ||
        p.sku === clean ||
        (p.productId || p.id) === clean
    );

    if (exactMatch) {
      onSelectProduct(exactMatch);
      setQuery("");
      setIsOpen(false);
    }
  }, [query, products, onSelectProduct]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredProducts]);

  const handleKeyDown = (e) => {
    if (!filteredProducts.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredProducts.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredProducts.length) % filteredProducts.length);
    } else if (e.key === "Enter" && filteredProducts[selectedIndex]) {
      e.preventDefault();
      onSelectProduct(filteredProducts[selectedIndex]);
      setQuery("");
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  };

  const handleSelect = (product) => {
    onSelectProduct(product);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search product, barcode, or item code... (Ctrl + K)"
          className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-10 pr-24 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-[#A41821] focus:ring-2 focus:ring-[#A41821]/15 outline-hidden transition shadow-xs disabled:bg-slate-100"
        />

        <div className="absolute inset-y-0 right-2 flex items-center gap-1.5 pointer-events-none">
          {query ? (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setQuery("")}
              className="pointer-events-auto p-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 font-mono">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {filteredProducts.length > 0 ? (
            <div className="space-y-0.5">
              {filteredProducts.map((product, idx) => {
                const prodId = product.productId || product.id;
                const isCompleted = completedProductIds.has(prodId);
                const isHighlighted = idx === selectedIndex;

                return (
                  <button
                    key={prodId}
                    type="button"
                    onClick={() => handleSelect(product)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition cursor-pointer ${
                      isHighlighted
                        ? "bg-[#A41821] text-white"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        {/* Title Case Product Typography */}
                        <span className="font-bold truncate text-sm">
                          {formatProductName(product.name)}
                        </span>
                        {isCompleted && (
                          <span
                            className={`rounded-full px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                              isHighlighted ? "bg-white/20 text-white" : "bg-emerald-100 text-[#017C4D]"
                            }`}
                          >
                            ✓ AUDITED
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] font-mono mt-0.5 ${
                          isHighlighted ? "text-white/80" : "text-slate-400"
                        }`}
                      >
                        CODE: {product.barcode || product.sku || prodId} • {product.category} ({product.unit})
                      </div>
                    </div>

                    <div className="flex-none text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          isHighlighted ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Select ↵
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              No assigned products match "<span className="font-bold">{query}</span>"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
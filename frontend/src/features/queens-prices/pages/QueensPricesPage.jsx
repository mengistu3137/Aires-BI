import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueensPrices } from "../hooks/useQueensPrices.js";
import { QueensPriceFilters } from "../components/QueensPriceFilters.jsx";
import { QueensPriceListTable } from "../components/QueensPriceListTable.jsx";
import { QueensPriceMobileList } from "../components/QueensPriceMobileList.jsx";
import { QueensPriceEmptyState } from "../components/QueensPriceEmptyState.jsx";

export const QueensPricesPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentOnly, setCurrentOnly] = useState(false);

  // Debounce search input by 300ms to avoid spamming requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1); // Reset to page 1 on new search term
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Server-side query filters: sends search to backend
  const filters = useMemo(
    () => ({
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      current: currentOnly ? "true" : undefined,
    }),
    [page, debouncedSearch, currentOnly]
  );

  const { data, isLoading, isError, error } = useQueensPrices(filters);

  const prices = data?.prices || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Queens Prices</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage benchmark prices and historical price periods across products.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/queens-prices/new")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Queens Price
        </button>
      </div>

      {/* Filters (passes search and triggers debounced backend query) */}
      <QueensPriceFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        currentFilter={currentOnly}
        onCurrentFilterChange={(val) => {
          setCurrentOnly(val);
          setPage(1);
        }}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
            <p className="text-xs font-semibold text-slate-500">Searching benchmark prices...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-[#A41821]">
            {error?.message || "Unable to load Queens prices"}
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {prices.length === 0 ? (
            <QueensPriceEmptyState
              title={debouncedSearch ? `No products match "${debouncedSearch}"` : "No Queens prices found"}
              description={
                debouncedSearch
                  ? "Try searching with a different product name, brand, or SKU."
                  : currentOnly
                  ? "No currently active Queens prices match your filters."
                  : "Benchmark prices define the reference price used for price analysis."
              }
              action={
                debouncedSearch ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setDebouncedSearch("");
                    }}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/queens-prices/new")}
                    className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219]"
                  >
                    Add Queens Price
                  </button>
                )
              }
            />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <QueensPriceListTable prices={prices} />
              </div>

              {/* Mobile List */}
              <div className="md:hidden">
                <QueensPriceMobileList prices={prices} />
              </div>
            </>
          )}

          {/* Database-wide Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Page {meta.page} of {meta.totalPages} ({meta.total} total items)
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
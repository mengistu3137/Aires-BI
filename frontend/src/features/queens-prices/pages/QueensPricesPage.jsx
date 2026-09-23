import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueensPrices } from "../hooks/useQueensPrices.js";
import { QueensPriceFilters } from "../components/QueensPriceFilters.jsx";
import { QueensPriceListTable } from "../components/QueensPriceListTable.jsx";
import { QueensPriceMobileList } from "../components/QueensPriceMobileList.jsx";
import { QueensPriceEmptyState } from "../components/QueensPriceEmptyState.jsx";

export const QueensPricesPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [currentOnly, setCurrentOnly] = useState(false);

  const filters = useMemo(
    () => ({
      page,
      limit: 20,
      // Backend does not support a `search` param directly — we filter by product at the API level.
      // If your backend adds a `search` param later, wire it through here.
      current: currentOnly ? "true" : undefined,
    }),
    [page, currentOnly]
  );

  const { data, isLoading, isError, error } = useQueensPrices(filters);

  const prices = data?.prices || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  // Client-side search across loaded page (products)
  const visiblePrices = useMemo(() => {
    if (!search.trim()) return prices;
    const term = search.toLowerCase();
    return prices.filter((p) => {
      const name = p.product?.name?.toLowerCase() || "";
      const sku = p.product?.sku?.toLowerCase() || "";
      const category = p.product?.category?.toLowerCase() || "";
      return name.includes(term) || sku.includes(term) || category.includes(term);
    });
  }, [prices, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800">Queens prices</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage benchmark prices and view historical price periods across products.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/queens-prices/new")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#A41821] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#7F1219]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Queens price
        </button>
      </div>

      {/* Filters */}
      <QueensPriceFilters
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
        }}
        currentFilter={currentOnly}
        onCurrentFilterChange={(val) => {
          setCurrentOnly(val);
          setPage(1);
        }}
      />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
        </div>
      )}

      {/* Error */}
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
          {visiblePrices.length === 0 ? (
            <QueensPriceEmptyState
              title="No Queens prices found"
              description={
                currentOnly
                  ? "No currently active Queens prices match your filters."
                  : "Benchmark prices define the reference price used for price analysis."
              }
              action={
                <button
                  type="button"
                  onClick={() => navigate("/queens-prices/new")}
                  className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219]"
                >
                  Add Queens price
                </button>
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <QueensPriceListTable prices={visiblePrices} />
              </div>

              {/* Mobile list */}
              <div className="md:hidden">
                <QueensPriceMobileList prices={visiblePrices} />
              </div>
            </>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
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

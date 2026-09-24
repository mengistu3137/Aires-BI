import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";
import { useProductQueensPriceHistory } from "../hooks/useProductQueensPriceHistory.js";
import { useCurrentQueensPrice } from "../hooks/useCurrentQueensPrice.js";
import { QueensPriceCurrentSummary } from "../components/QueensPriceCurrentSummary.jsx";
import { QueensPriceHistory } from "../components/QueensPriceHistory.jsx";

export const ProductQueensPricesPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  // 1. Authoritative product master data query
  const {
    data: product,
    isLoading: isProductLoading,
    isError: isProductError,
    error: productError,
  } = useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: async () => {
      const res = await apiClient.get(`/products/${productId}`);
      return res.data;
    },
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data || data,
  });

  // 2. Active benchmark and historical price timeline queries
  const { data: currentData, isLoading: isCurrentLoading } = useCurrentQueensPrice(productId);
  const {
    data: historyData,
    isLoading: isHistoryLoading,
    isError: isHistoryError,
    error: historyError,
  } = useProductQueensPriceHistory(productId, { limit: 100 });

  const prices = historyData?.prices || [];
  const currentPrice = currentData || prices.find((p) => !p.effectiveTo) || prices[0];
  const isPageLoading = isProductLoading || isCurrentLoading || isHistoryLoading;

  // 3. Centralized Loading State
  if (isPageLoading) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="flex flex-col items-center gap-2.5">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
          <p className="text-xs font-semibold text-slate-500">Loading benchmark price history...</p>
        </div>
      </div>
    );
  }

  // 4. Product Not Found / Error State
  if (isProductError || !product) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
        <p className="text-sm font-bold text-[#A41821]">
          {productError?.message || "Product not found or inactive"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          The requested product benchmark could not be retrieved from the catalog.
        </p>
        <button
          type="button"
          onClick={() => navigate("/queens-prices")}
          className="mt-4 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219]"
        >
          Return to Benchmark Prices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Header with typography rules: Sentence case description & UPPERCASE micro-label */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>{product.category}</span>
          {product.sku && (
            <>
              <span>•</span>
              <span className="font-mono">SKU: {product.sku}</span>
            </>
          )}
          {product.unit && (
            <>
              <span>•</span>
              <span>Unit: {product.unit}</span>
            </>
          )}
        </div>
        <h1 className="mt-1 text-lg font-black text-slate-800">{product.name}</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Queen's benchmark price history and active benchmark rate for competitor price analysis.
        </p>
      </div>

      {/* Current benchmark price summary card */}
      <QueensPriceCurrentSummary
        product={product}
        currentPrice={currentPrice}
        historyCount={prices.length}
        onAdd={() => navigate(`/queens-prices/new?productId=${productId}`)}
      />

      {/* Historical price timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <QueensPriceHistory
          prices={prices}
          isLoading={false}
          isError={isHistoryError}
          error={historyError}
          onAdd={() => navigate(`/queens-prices/new?productId=${productId}`)}
        />
      </div>
    </div>
  );
};
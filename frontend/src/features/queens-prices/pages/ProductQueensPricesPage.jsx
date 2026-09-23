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

  const { data: product } = useQuery({
    queryKey: ["products", "detail", productId],
    queryFn: async () => {
      const res = await apiClient.get(`/products/${productId}`);
      return res.data;
    },
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
  });

  const { data: currentData } = useCurrentQueensPrice(productId);
  const {
    data: historyData,
    isLoading,
    isError,
    error,
  } = useProductQueensPriceHistory(productId, { limit: 100 });

  const prices = historyData?.prices || [];
  const currentPrice = currentData || prices.find((p) => !p.effectiveTo) || prices[0];

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
      <div>
        <h1 className="text-lg font-black text-slate-800">{product?.name || "Product"}</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Queens benchmark price history and current price.
        </p>
      </div>

      {/* Current price summary */}
      <QueensPriceCurrentSummary
        product={product}
        currentPrice={currentPrice}
        historyCount={prices.length}
        onAdd={() => navigate(`/queens-prices/new?productId=${productId}`)}
      />

      {/* History */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <QueensPriceHistory
          prices={prices}
          isLoading={isLoading}
          isError={isError}
          error={error}
          onAdd={() => navigate(`/queens-prices/new?productId=${productId}`)}
        />
      </div>
    </div>
  );
};

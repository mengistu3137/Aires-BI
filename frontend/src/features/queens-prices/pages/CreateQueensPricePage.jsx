import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";
import { QueensPriceCreateEditForm } from "../components/QueensPriceCreateEditForm.jsx";
import { useCreateQueensPrice } from "../hooks/useQueensPriceMutations.js";
import { useProductQueensPriceHistory } from "../hooks/useProductQueensPriceHistory.js";

/**
 * Robust extractor to handle any Express API envelope:
 * { data: { product: {...} } } | { data: {...} } | { product: {...} } | {...}
 */
const unwrapProduct = (resData) => {
  if (!resData) return null;
  if (resData.data?.product) return resData.data.product;
  if (resData.product) return resData.product;
  if (resData.data && typeof resData.data === "object" && !Array.isArray(resData.data)) {
    return resData.data;
  }
  return resData;
};

export const CreateQueensPricePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Sanitize preselected product ID
  const rawProductId = searchParams.get("productId");
  const preselectedProductId = useMemo(() => {
    if (!rawProductId) return "";
    const trimmed = rawProductId.trim();
    if (trimmed === "undefined" || trimmed === "null") return "";
    return trimmed;
  }, [rawProductId]);

  const [submitError, setSubmitError] = useState(null);
  const createMutation = useCreateQueensPrice();

  // Load preselected product details safely
  const { data: rawProduct, isLoading: isProductLoading } = useQuery({
    queryKey: ["products", "detail", preselectedProductId],
    queryFn: async () => {
      const res = await apiClient.get(`/products/${encodeURIComponent(preselectedProductId)}`);
      return unwrapProduct(res.data);
    },
    enabled: Boolean(preselectedProductId),
    staleTime: 5 * 60 * 1000,
  });

  const product = useMemo(() => unwrapProduct(rawProduct), [rawProduct]);

  // Load historical benchmark intervals
  const { data: historyData } = useProductQueensPriceHistory(
    preselectedProductId,
    { limit: 100 },
    { enabled: Boolean(preselectedProductId) }
  );

  const existingPeriods = historyData?.prices || [];

  const handleSubmit = async (payload) => {
    setSubmitError(null);
    try {
      const result = await createMutation.mutateAsync(payload);
      const newId = result?.data?.id || result?.id;
      navigate(newId ? `/queens-prices/${newId}` : "/queens-prices");
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message || error?.message || "Unable to save Queens benchmark price"
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

    {/*   <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Benchmark Management
        </div>
        <h1 className="mt-1 text-xl font-black text-slate-900 tracking-tight">
          Add Queens Price
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Set the official benchmark price for this product. Prices are time-bounded and automatically supersede prior open periods without overlapping.
        </p>
      </div>
 */}
      {isProductLoading ? (
        <div className="flex h-36 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#A41821] border-t-transparent" />
            <p className="text-xs font-semibold text-slate-500">Loading product information...</p>
          </div>
        </div>
      ) : (
        <QueensPriceCreateEditForm
          mode="create"
          lockedProduct={product || null}
          initialValues={preselectedProductId ? { productId: preselectedProductId } : null}
          existingPeriods={existingPeriods}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          isSubmitting={createMutation.isPending}
          submitError={submitError}
        />
      )}
    </div>
  );
};
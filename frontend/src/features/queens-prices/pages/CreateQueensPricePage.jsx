import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";
import { QueensPriceCreateEditForm } from "../components/QueensPriceCreateEditForm.jsx";
import { useCreateQueensPrice } from "../hooks/useQueensPriceMutations.js";
import { useProductQueensPriceHistory } from "../hooks/useProductQueensPriceHistory.js";

export const CreateQueensPricePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProductId = searchParams.get("productId") || "";
  const [submitError, setSubmitError] = useState(null);

  const createMutation = useCreateQueensPrice();

  // Load the preselected product (if any) and its existing periods
  const { data: product } = useQuery({
    queryKey: ["products", "detail", preselectedProductId],
    queryFn: async () => {
      const res = await apiClient.get(`/products/${preselectedProductId}`);
      return res.data;
    },
    enabled: Boolean(preselectedProductId),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
  });

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
      const newId = result?.data?.id;
      navigate(newId ? `/queens-prices/${newId}` : "/queens-prices");
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message || error?.message || "Unable to create Queens price"
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>

      <div>
        <h1 className="text-lg font-black text-slate-800">Add Queens price</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Define the effective benchmark price for a product. Prices are time-bounded and must not
          overlap with existing periods.
        </p>
      </div>

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
    </div>
  );
};

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QueensPriceCreateEditForm } from "../components/QueensPriceCreateEditForm.jsx";
import { useQueensPrice } from "../hooks/useQueensPrice.js";
import { useProductQueensPriceHistory } from "../hooks/useProductQueensPriceHistory.js";
import { useUpdateQueensPrice } from "../hooks/useQueensPriceMutations.js";
import { getQueensPriceStatus } from "../utils/queens-price.utils.js";

export const EditQueensPricePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState(null);

  const { data: queensPrice, isLoading, isError, error } = useQueensPrice(id);

  const productId = queensPrice?.productId;
  const { data: historyData } = useProductQueensPriceHistory(
    productId,
    { limit: 100 },
    { enabled: Boolean(productId) }
  );
  const existingPeriods = historyData?.prices || [];

  const updateMutation = useUpdateQueensPrice();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !queensPrice) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">
          {error?.message || "Queens price not found"}
        </p>
        <button
          type="button"
          onClick={() => navigate("/queens-prices")}
          className="mt-3 rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white"
        >
          Back to Queens prices
        </button>
      </div>
    );
  }

  const status = getQueensPriceStatus(queensPrice);
  const isHistorical = status === "HISTORICAL";

  const handleSubmit = async (payload) => {
    setSubmitError(null);
    try {
      await updateMutation.mutateAsync({ id, payload });
      navigate(`/queens-prices/${id}`);
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message || err?.message || "Unable to update Queens price"
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
        <h1 className="text-lg font-black text-slate-800">Edit Queens price</h1>
        <p className="mt-0.5 text-xs text-slate-500">{queensPrice.product?.name}</p>
      </div>

      {isHistorical && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-bold text-[#FE7914]">This is a historical benchmark price.</p>
          <p className="mt-0.5 text-[11px] text-amber-700">
            Changing a historical price may affect how historical pricing is interpreted. The
            backend may reject this operation.
          </p>
        </div>
      )}

      <QueensPriceCreateEditForm
        mode="edit"
        initialValues={queensPrice}
        lockedProduct={queensPrice.product}
        existingPeriods={existingPeriods}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
        isSubmitting={updateMutation.isPending}
        submitError={submitError}
      />
    </div>
  );
};

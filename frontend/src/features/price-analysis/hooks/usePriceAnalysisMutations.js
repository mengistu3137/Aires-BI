import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  calculateProductAnalysisRequest,
  recalculateSurveyPeriodRequest,
  applyRecommendedPriceRequest,
} from "@/services/api/price-analysis.api.js";

/**
 * Async invalidation + refetch of every query key that could reference
 * a price analysis record. Awaits the invalidation/refetch cycle so callers
 * using `await mutateAsync(...)` don't resolve until the UI reflects the
 * new data.
 *
 * Invalidates:
 *   - price-analysis   (list, detail, product-survey-period)
 *   - queens-prices    (1-click apply writes a new benchmark)
 *   - alerts           (alerts are derived from analyses)
 *   - dashboard        (dashboard tiles summarize analyses)
 *
 * Force-refetches (more aggressive than invalidate):
 *   - any active ["price-analysis", "list"] query
 *   - the exact ["price-analysis", "product-survey-period", productId, surveyPeriodId]
 *     query if both IDs are known
 */
const invalidatePriceAnalysisQueriesAsync = async (
  queryClient,
  { productId, surveyPeriodId } = {}
) => {
  // 1. Broad invalidation — catches list, detail, product-period
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["price-analysis"] }),
    queryClient.invalidateQueries({ queryKey: ["queens-prices"] }),
    queryClient.invalidateQueries({ queryKey: ["alerts"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  ]);

  // 2. Force-refetch currently-mounted list queries so the UI updates
  //    immediately rather than waiting for the next focus event.
  const refetches = [
    queryClient.refetchQueries({
      queryKey: ["price-analysis", "list"],
      type: "active",
    }),
  ];

  // 3. If we know the specific product+period, force-refetch that exact query
  if (productId && surveyPeriodId) {
    refetches.push(
      queryClient.refetchQueries({
        queryKey: [
          "price-analysis",
          "product-survey-period",
          productId,
          surveyPeriodId,
        ],
        type: "active",
      })
    );
  }

  await Promise.all(refetches);
};

/**
 * Fire-and-forget (sync) wrapper around the async invalidator.
 * Kept for `onSuccess` handlers that don't need to await settlement.
 */
const invalidatePriceAnalysisQueries = (
  queryClient,
  { productId, surveyPeriodId } = {}
) => {
  invalidatePriceAnalysisQueriesAsync(queryClient, {
    productId,
    surveyPeriodId,
  });
};

/**
 * Single-product calculate — 60s is enough.
 */
export const useCalculateProductAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: calculateProductAnalysisRequest,
    onSuccess: (data) => {
      toast.success("Price analysis calculated");
      invalidatePriceAnalysisQueries(queryClient, {
        productId: data?.data?.productId,
        surveyPeriodId: data?.data?.surveyPeriodId,
      });
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Recalculate every product assigned to a survey period.
 * Batch operation — can take minutes for large periods.
 */
export const useRecalculateSurveyPeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recalculateSurveyPeriodRequest,
    onSuccess: async (data, variables) => {
      const surveyPeriodId =
        typeof variables === "string" ? variables : variables?.surveyPeriodId;

      const result = data?.data || {};
      const processed = result.processedCount ?? 0;
      const failed = result.failedCount ?? 0;

      if (failed > 0 && processed === 0) {
        toast.error(
          `Analysis failed for all ${failed} product${failed === 1 ? "" : "s"
          }. Check the console for details.`
        );
      } else if (failed > 0) {
        toast.success(
          `Recalculated ${processed} product${processed === 1 ? "" : "s"
          } · ${failed} failed`
        );
      } else if (processed > 0) {
        toast.success(
          `Recalculated ${processed} product${processed === 1 ? "" : "s"}`
        );
      } else {
        toast("No products assigned to this survey period", { icon: "ℹ️" });
      }

      // Log failures so the user can inspect them in devtools
      if (Array.isArray(result.errors) && result.errors.length > 0) {
        console.warn("[Price Analysis] Recalc failures:", result.errors);
      }

      // Invalidate + force refetch, and wait for settlement
      await invalidatePriceAnalysisQueriesAsync(queryClient, {
        surveyPeriodId,
      });
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * 1-Click apply recommended price.
 *
 * Backend side-effects: closes the previous open-ended QueensPrice and
 * creates a new one effective immediately, then recalculates the analysis.
 * We therefore invalidate BOTH `price-analysis` AND `queens-prices`.
 */
export const useApplyRecommendedPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyRecommendedPriceRequest,
    onSuccess: (data) => {
      toast.success(
        data?.message || "Queens benchmark price adjusted successfully"
      );

      invalidatePriceAnalysisQueries(queryClient, {
        productId: data?.data?.analysis?.productId,
        surveyPeriodId: data?.data?.analysis?.surveyPeriodId,
      });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to adjust benchmark price"
      );
    },
    meta: { skipGlobalToast: true },
  });
};
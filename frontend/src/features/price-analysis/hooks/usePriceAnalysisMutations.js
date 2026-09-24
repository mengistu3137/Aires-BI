import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  calculateProductAnalysisRequest,
  recalculateSurveyPeriodRequest,
} from "@/services/api/price-analysis.api.js";

/**
 * Invalidate every query key that could reference a price analysis record.
 * Also force a refetch of any currently-mounted list queries so the UI
 * updates immediately rather than waiting for the next focus event.
 */
const invalidatePriceAnalysisQueries = (queryClient, { productId, surveyPeriodId } = {}) => {
  // 1. Broad invalidation — catches list, detail, product-period
  queryClient.invalidateQueries({ queryKey: ["price-analysis"] });

  // 2. Downstream features that derive from analyses
  queryClient.invalidateQueries({ queryKey: ["alerts"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });

  // 3. If we know the specific product+period, force-refetch that exact query
  if (productId && surveyPeriodId) {
    queryClient.refetchQueries({
      queryKey: ["price-analysis", "product-survey-period", productId, surveyPeriodId],
      type: "active",
    });
  }

  // 4. Force-refetch any currently-active list queries
  //    (refetchQueries is more aggressive than invalidateQueries)
  queryClient.refetchQueries({
    queryKey: ["price-analysis", "list"],
    type: "active",
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
      const surveyPeriodId = typeof variables === "string" ? variables : variables?.surveyPeriodId;

      const result = data?.data || {};
      const processed = result.processedCount ?? 0;
      const failed = result.failedCount ?? 0;

      if (failed > 0 && processed === 0) {
        toast.error(
          `Analysis failed for all ${failed} product${failed === 1 ? "" : "s"}. Check the console for details.`
        );
      } else if (failed > 0) {
        toast.success(
          `Recalculated ${processed} product${processed === 1 ? "" : "s"} · ${failed} failed`
        );
      } else if (processed > 0) {
        toast.success(`Recalculated ${processed} product${processed === 1 ? "" : "s"}`);
      } else {
        toast("No products assigned to this survey period", { icon: "ℹ️" });
      }

      // Log failures so the user can inspect them in devtools
      if (Array.isArray(result.errors) && result.errors.length > 0) {
        console.warn("[Price Analysis] Recalc failures:", result.errors);
      }

      // Invalidate + force refetch
      await invalidatePriceAnalysisQueriesAsync(queryClient, {
        surveyPeriodId,
      });
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Async variant: wait for the invalidation + refetch to settle before
 * resolving so the caller's `await mutateAsync` doesn't return until
 * the list reflects the new data.
 */
const invalidatePriceAnalysisQueriesAsync = async (
  queryClient,
  { productId, surveyPeriodId } = {}
) => {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ["price-analysis"] }),
    queryClient.invalidateQueries({ queryKey: ["alerts"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
  ];

  await Promise.all(invalidations);

  const refetches = [
    queryClient.refetchQueries({
      queryKey: ["price-analysis", "list"],
      type: "active",
    }),
  ];

  if (productId && surveyPeriodId) {
    refetches.push(
      queryClient.refetchQueries({
        queryKey: ["price-analysis", "product-survey-period", productId, surveyPeriodId],
        type: "active",
      })
    );
  }

  await Promise.all(refetches);
};

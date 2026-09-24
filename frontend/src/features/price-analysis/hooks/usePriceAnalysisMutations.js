import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  calculateProductAnalysisRequest,
  recalculateSurveyPeriodRequest,
} from "@/services/api/price-analysis.api.js";

/**
 * Invalidate all price analysis-related queries
 */
const invalidatePriceAnalysisQueries = (queryClient, { productId, surveyPeriodId } = {}) => {
  queryClient.invalidateQueries({ queryKey: ["price-analysis", "list"] });
  if (productId && surveyPeriodId) {
    queryClient.invalidateQueries({
      queryKey: ["price-analysis", "product-survey-period", productId, surveyPeriodId],
    });
  }
};

/**
 * Calculate or refresh analysis for a single product in a survey period
 * ADMIN & MANAGER only
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
 * Batch recalculate entire survey period
 * ADMIN & MANAGER only
 */
export const useRecalculateSurveyPeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recalculateSurveyPeriodRequest,
    onSuccess: (data) => {
      const processed = data?.data?.processedCount ?? 0;
      const failed = data?.data?.failedCount ?? 0;

      if (failed > 0) {
        toast.success(
          `Recalculated ${processed} product${processed === 1 ? "" : "s"}, ${failed} failed`
        );
      } else {
        toast.success(`Recalculated ${processed} product${processed === 1 ? "" : "s"}`);
      }

      invalidatePriceAnalysisQueries(queryClient, {
        surveyPeriodId: data?.data?.surveyPeriodId,
      });
    },
    meta: { skipGlobalToast: true },
  });
};

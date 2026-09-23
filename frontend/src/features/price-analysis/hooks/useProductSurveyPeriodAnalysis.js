import { useQuery } from "@tanstack/react-query";
import { getProductSurveyPeriodAnalysisRequest } from "@/services/api/price-analysis.api.js";

/**
 * Hook for fetching the analysis for a specific product within a survey period
 */
export const useProductSurveyPeriodAnalysis = ({ productId, surveyPeriodId }, options = {}) => {
  return useQuery({
    queryKey: ["price-analysis", "product-survey-period", productId, surveyPeriodId],
    queryFn: () => getProductSurveyPeriodAnalysisRequest({ productId, surveyPeriodId }),
    enabled: Boolean(productId && surveyPeriodId),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
    ...options,
  });
};

import { useQuery } from "@tanstack/react-query";
import { getPriceAnalysisByIdRequest } from "@/services/api/price-analysis.api.js";

/**
 * Hook for fetching a single price analysis by ID
 */
export const usePriceAnalysis = (id, options = {}) => {
  return useQuery({
    queryKey: ["price-analysis", "detail", id],
    queryFn: () => getPriceAnalysisByIdRequest(id),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
    ...options,
  });
};

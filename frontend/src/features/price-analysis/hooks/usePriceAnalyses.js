import { useQuery } from "@tanstack/react-query";
import { listPriceAnalysesRequest } from "@/services/api/price-analysis.api.js";

/**
 * Hook for listing price analyses with filters and pagination
 */
export const usePriceAnalyses = (filters = {}) => {
  return useQuery({
    queryKey: ["price-analysis", "list", filters],
    queryFn: () => listPriceAnalysesRequest(filters),
    staleTime: 2 * 60 * 1000,
    select: (data) => ({
      analyses: data.data || [],
      meta: data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    }),
  });
};

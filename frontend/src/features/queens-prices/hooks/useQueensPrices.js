import { useQuery } from "@tanstack/react-query";
import { listQueensPricesRequest } from "@/services/api/queens-prices.api.js";

/**
 * Hook for listing Queens prices with filters and pagination
 */
export const useQueensPrices = (filters = {}) => {
  return useQuery({
    queryKey: ["queens-prices", "list", filters],
    queryFn: () => listQueensPricesRequest(filters),
    staleTime: 2 * 60 * 1000,
    select: (data) => ({
      prices: data.data || [],
      meta: data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    }),
  });
};

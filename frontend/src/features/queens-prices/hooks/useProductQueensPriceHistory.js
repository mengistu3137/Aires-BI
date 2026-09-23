import { useQuery } from "@tanstack/react-query";
import { getProductQueensPriceHistoryRequest } from "@/services/api/queens-prices.api.js";

/**
 * Hook for fetching the Queens price history for a product
 */
export const useProductQueensPriceHistory = (productId, filters = {}, options = {}) => {
  return useQuery({
    queryKey: ["queens-prices", "history", productId, filters],
    queryFn: () => getProductQueensPriceHistoryRequest({ productId, params: filters }),
    enabled: Boolean(productId),
    staleTime: 2 * 60 * 1000,
    select: (data) => ({
      prices: data.data || [],
      meta: data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    }),
    ...options,
  });
};

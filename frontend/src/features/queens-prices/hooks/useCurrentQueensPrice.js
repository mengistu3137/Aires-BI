import { useQuery } from "@tanstack/react-query";
import { getCurrentQueensPriceRequest } from "@/services/api/queens-prices.api.js";

/**
 * Hook for fetching the current Queens price for a product
 */
export const useCurrentQueensPrice = (productId, options = {}) => {
  return useQuery({
    queryKey: ["queens-prices", "current", productId],
    queryFn: () => getCurrentQueensPriceRequest(productId),
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
    ...options,
  });
};

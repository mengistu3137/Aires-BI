import { useQuery } from "@tanstack/react-query";
import { getQueensPriceByIdRequest } from "@/services/api/queens-prices.api.js";

/**
 * Hook for fetching a single Queens price by ID
 */
export const useQueensPrice = (id, options = {}) => {
  return useQuery({
    queryKey: ["queens-prices", "detail", id],
    queryFn: () => getQueensPriceByIdRequest(id),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
    ...options,
  });
};

import { useQuery } from "@tanstack/react-query";
import { getAlertByIdRequest } from "@/services/api/alerts.api.js";

/**
 * Hook for fetching a single alert by ID
 */
export const useAlert = (id, options = {}) => {
  return useQuery({
    queryKey: ["alerts", "detail", id],
    queryFn: () => getAlertByIdRequest(id),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
    select: (data) => data.data,
    ...options,
  });
};

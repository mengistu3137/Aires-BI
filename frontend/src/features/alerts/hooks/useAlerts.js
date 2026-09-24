import { useQuery } from "@tanstack/react-query";
import { listAlertsRequest } from "@/services/api/alerts.api.js";

/**
 * Hook for listing alerts with filters and pagination
 */
export const useAlerts = (filters = {}) => {
  return useQuery({
    queryKey: ["alerts", "list", filters],
    queryFn: () => listAlertsRequest(filters),
    staleTime: 60 * 1000,
    select: (data) => ({
      alerts: data.data || [],
      meta: data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    }),
  });
};

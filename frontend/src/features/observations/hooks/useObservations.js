import { useQuery } from "@tanstack/react-query";
import { listObservationsRequest } from "@/services/api/observations.api.js";

/**
 * Hook for listing observations globally across all audits.
 * Role-scoped by the backend.
 */
export const useObservations = (filters = {}) => {
  return useQuery({
    queryKey: ["observations", "list", filters],
    queryFn: () => listObservationsRequest(filters),
    staleTime: 60 * 1000,
    select: (data) => ({
      observations: data.data || [],
      meta: data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    }),
  });
};

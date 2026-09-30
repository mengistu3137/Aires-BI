import { useQuery } from "@tanstack/react-query";
import { listAuditObservationsRequest } from "@/services/api/observations.api.js";

/**
 * Hook for listing observations for an audit.
 * Enforces a minimum limit of 200 so assigned product checklists up to 120 items
 * are never truncated across pagination boundaries during field collection.
 */
export const useAuditObservations = (auditId, filters = {}) => {
  const queryParams = { limit: 200, ...filters };

  return useQuery({
    queryKey: ["observations", "audit", auditId, queryParams],
    queryFn: () => listAuditObservationsRequest({ auditId, params: queryParams }),
    enabled: Boolean(auditId),
    staleTime: 30 * 1000,
    networkMode: "offlineFirst",
    select: (data) => ({
      observations: data.data || [],
      meta: data.meta || {
        page: 1,
        limit: 200,
        total: 0,
        totalPages: 1,
        completeness: {
          expectedProductsCount: 0,
          observedProductsCount: 0,
          missingProductsCount: 0,
          missingProducts: [],
        },
      },
    }),
  });
};
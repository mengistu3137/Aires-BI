import { useQuery } from "@tanstack/react-query";
import { listAuditObservationsRequest } from "@/services/api/observations.api.js";

/**
 * Hook for listing observations for an audit.
 *
 * networkMode: "offlineFirst" — see useObservations.js for why. Note this
 * only affects the *server* half of the picture; the auditor's own
 * collection view merges this with the local offline queue (useLocalQueue)
 * regardless of network mode, so newly-captured offline rows still show up
 * immediately either way.
 */
export const useAuditObservations = (auditId, filters = {}) => {
  return useQuery({
    queryKey: ["observations", "audit", auditId, filters],
    queryFn: () => listAuditObservationsRequest({ auditId, params: filters }),
    enabled: Boolean(auditId),
    staleTime: 30 * 1000,
    networkMode: "offlineFirst",
    select: (data) => ({
      observations: data.data || [],
      meta: data.meta || {
        page: 1,
        limit: 20,
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

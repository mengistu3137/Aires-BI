import { useQuery } from "@tanstack/react-query";
import { getObservationByIdRequest } from "@/services/api/observations.api.js";

/**
 * Hook for fetching a single observation
 */
export const useObservation = (observationId, options = {}) => {
  return useQuery({
    queryKey: ["observations", "detail", observationId],
    queryFn: () => getObservationByIdRequest(observationId),
    enabled: Boolean(observationId),
    staleTime: 30 * 1000,
    select: (data) => data.data,
    ...options,
  });
};

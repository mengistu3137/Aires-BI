import { useQuery } from "@tanstack/react-query";
import { getObservationByIdRequest } from "@/services/api/observations.api.js";

/**
 * Hook for fetching a single observation.
 *
 * networkMode: "offlineFirst" — see useObservations.js for why. Without
 * it, opening a detail link offline with nothing cached yet just hangs
 * on the loading spinner instead of failing fast so the page can show a
 * proper offline message.
 */
export const useObservation = (observationId, options = {}) => {
  return useQuery({
    queryKey: ["observations", "detail", observationId],
    queryFn: () => getObservationByIdRequest(observationId),
    enabled: Boolean(observationId),
    staleTime: 30 * 1000,
    networkMode: "offlineFirst",
    select: (data) => data.data,
    ...options,
  });
};

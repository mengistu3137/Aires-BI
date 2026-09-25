import { useQuery } from "@tanstack/react-query";
import { listObservationsRequest } from "@/services/api/observations.api.js";

/**
 * Hook for listing observations globally across all audits.
 * Role-scoped by the backend.
 *
 * networkMode: "offlineFirst" — with the default "online" mode, opening
 * this page offline with nothing cached yet leaves the query stuck in a
 * "paused" state (isLoading stays true forever, since it never even
 * attempts the request). "offlineFirst" always makes the first attempt,
 * so it fails fast and the page can show a real "you're offline" message
 * instead of an infinite spinner. Once there's cached data, this has no
 * effect on the happy path.
 */
export const useObservations = (filters = {}) => {
  return useQuery({
    queryKey: ["observations", "list", filters],
    queryFn: () => listObservationsRequest(filters),
    staleTime: 60 * 1000,
    networkMode: "offlineFirst",
    select: (data) => ({
      observations: data.data || [],
      meta: data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    }),
  });
};

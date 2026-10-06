import { useQuery } from "@tanstack/react-query";
import { screenObservationAIRequest } from "@/services/api/ai.api.js";

export const useObservationAI = (observationId, enabled = true) => {
    return useQuery({
        queryKey: ["ai", "screen-observation", observationId],
        queryFn: () => screenObservationAIRequest(observationId),
        enabled: Boolean(observationId) && enabled,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });
};
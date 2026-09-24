import { useQuery } from "@tanstack/react-query";
import { listSurveyPeriodsRequest } from "@/services/api/dashboard.api.js";

/**
 * Survey periods for the Dashboard selector.
 * Prefers OPEN period if any exist (handled by parent page).
 */
export const useDashboardSurveyPeriods = () => {
  return useQuery({
    queryKey: ["dashboard", "survey-periods"],
    queryFn: listSurveyPeriodsRequest,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data || [],
  });
};

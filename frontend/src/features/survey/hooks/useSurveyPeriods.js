import { useQuery } from "@tanstack/react-query";
import { getAllPeriodsRequest } from "@/services/api/survey.api.js";

/**
 * Shared survey periods hook.
 *
 * Fetches all survey periods through the survey API layer and normalizes
 * the response to a flat, sorted array.
 *
 * Backend: GET /surveys/periods → { status, results, data: { periods } }
 *
 * Used by:
 *  - src/components/SurveyPeriodSelector.jsx
 *  - Dashboard
 *  - Price Analysis
 */
export const useSurveyPeriods = () => {
  return useQuery({
    queryKey: ["surveyPeriods", "all"],
    queryFn: async () => {
      const res = await getAllPeriodsRequest();
      return res?.data?.periods || [];
    },
    staleTime: 5 * 60 * 1000,
    select: (periods) =>
      [...periods].sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
        return bDate - aDate;
      }),
  });
};

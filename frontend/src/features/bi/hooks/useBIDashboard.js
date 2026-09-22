import { useQuery } from "@tanstack/react-query";
import { getBIDashboardRequest } from "@/services/api/bi.api.js";
import { useSurveyStore } from "@/stores/survey/survey.store.js";
import {
  computeBIResults,
  generateDashboardSummary,
  generateCategorySummaries,
  generateAlerts,
} from "@/services/biEngine.js";

/**
 * Fetches BI analytics via TanStack Query.
 * If offline or backend is unreachable, falls back to the client-side BI engine.
 */
export const useBIDashboard = (periodId = "2026-W39", targetIndex = 0.95) => {
  const { products, competitors, surveyEntries } = useSurveyStore();

  return useQuery({
    queryKey: ["biDashboard", periodId, targetIndex],
    queryFn: async () => {
      try {
        const response = await getBIDashboardRequest({
          periodId,
          targetIndex,
        });
        return response?.data;
      } catch (err) {
        console.warn("Backend BI API unavailable, calculating via client-side engine:", err);

        // Client-side fallback calculation for offline PWA operation
        const biResults = computeBIResults(products, competitors, surveyEntries, periodId);
        const dashboardSummary = generateDashboardSummary(biResults, targetIndex);
        const categorySummaries = generateCategorySummaries(biResults, targetIndex);
        const alerts = generateAlerts(biResults);

        return {
          dashboardSummary,
          categorySummaries,
          biResults,
          alerts,
        };
      }
    },
    staleTime: 60 * 1000,
  });
};
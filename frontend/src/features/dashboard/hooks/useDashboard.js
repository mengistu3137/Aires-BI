import { useQuery } from "@tanstack/react-query";
import { getDashboardRequest } from "@/services/api/dashboard.api.js";

/**
 * Fetch aggregated dashboard data.
 *
 * Backend response:
 * {
 *   status, message,
 *   data: {
 *     scope, summary, assignments, audits, observations,
 *     analysis, alerts, recentAlerts, priceTrend
 *   }
 * }
 *
 * Role-scoped by backend — FIELD_AUDITOR sees only own data.
 */
export const useDashboard = (params = {}) => {
  return useQuery({
    queryKey: ["dashboard", "summary", params],
    queryFn: () => getDashboardRequest(params),
    staleTime: 60 * 1000,
    retry: false,
    select: (response) => response.data,
  });
};

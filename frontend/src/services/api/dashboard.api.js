import { apiClient } from "../client.js";

/**
 * Fetch aggregated dashboard data.
 * Backend: GET /dashboard
 * Query: surveyPeriodId?, productId?, dateFrom?, dateTo?
 */
export const getDashboardRequest = async (params = {}) => {
  const response = await apiClient.get("/dashboard", { params });
  return response.data;
};

/**
 * Fetch survey periods for the Dashboard selector.
 * Uses the generic survey periods list endpoint.
 */
export const listSurveyPeriodsRequest = async () => {
  const response = await apiClient.get("/survey-periods", {
    params: { limit: 100 },
  });
  console.log("listSurveyPeriodsRequest response:", response.data);
  return response.data.data || response.data || [];
};

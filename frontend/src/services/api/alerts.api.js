import { apiClient } from "../client.js";

/**
 * List alerts with filters and pagination
 */
export const listAlertsRequest = async (params = {}) => {
  const response = await apiClient.get("/alerts", { params });
  return response.data;
};

/**
 * Get only unresolved alerts (convenience endpoint)
 */
export const getActiveAlertsRequest = async (params = {}) => {
  const response = await apiClient.get("/alerts/active", { params });
  return response.data;
};

/**
 * Get a single alert by ID
 */
export const getAlertByIdRequest = async (id) => {
  const response = await apiClient.get(`/alerts/${id}`);
  return response.data;
};

/**
 * Resolve an alert with an optional resolution note (ADMIN/MANAGER)
 */
export const resolveAlertRequest = async ({ id, payload }) => {
  const response = await apiClient.post(`/alerts/${id}/resolve`, payload);
  return response.data;
};

/**
 * Trigger batch alert generation for a survey period (ADMIN/MANAGER)
 */
export const generateAlertsForSurveyPeriodRequest = async (payload) => {
  const response = await apiClient.post("/alerts/generate/survey-period", payload);
  return response.data;
};

/**
 * Trigger alert evaluation for a single PriceAnalysis (ADMIN/MANAGER)
 */
export const generateAlertForAnalysisRequest = async (payload) => {
  const response = await apiClient.post("/alerts/generate/analysis", payload);
  return response.data;
};

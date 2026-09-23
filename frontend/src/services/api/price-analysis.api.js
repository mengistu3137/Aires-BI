import { apiClient } from "../client.js";

/**
 * List price analyses with filters and pagination
 */
export const listPriceAnalysesRequest = async (params = {}) => {
  const response = await apiClient.get("/price-analysis", { params });
  return response.data;
};

/**
 * Get a single price analysis by ID
 */
export const getPriceAnalysisByIdRequest = async (id) => {
  const response = await apiClient.get(`/price-analysis/${id}`);
  return response.data;
};

/**
 * Get analysis for a specific product within a survey period
 * Returns null if not found (404 handled gracefully)
 */
export const getProductSurveyPeriodAnalysisRequest = async ({ productId, surveyPeriodId }) => {
  try {
    const response = await apiClient.get(
      `/price-analysis/product/${productId}/survey-period/${surveyPeriodId}`
    );
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return { data: null };
    }
    throw error;
  }
};

/**
 * Calculate or refresh analysis for a single product in a survey period
 * ADMIN & MANAGER only
 */
export const calculateProductAnalysisRequest = async (payload) => {
  const response = await apiClient.post("/price-analysis/calculate", payload);
  return response.data;
};

/**
 * Batch recalculate entire survey period
 * ADMIN & MANAGER only
 */
export const recalculateSurveyPeriodRequest = async (payload) => {
  const response = await apiClient.post("/price-analysis/recalculate", payload);
  return response.data;
};

import { apiClient } from "../client.js";

export const listPriceAnalysesRequest = async (params = {}) => {
  const response = await apiClient.get("/price-analysis", { params });
  return response.data;
};

export const getPriceAnalysisByIdRequest = async (id) => {
  const response = await apiClient.get(`/price-analysis/${id}`);
  return response.data;
};

export const getProductSurveyPeriodAnalysisRequest = async ({ productId, surveyPeriodId }) => {
  try {
    const response = await apiClient.get(
      `/price-analysis/product/${productId}/survey-period/${surveyPeriodId}`
    );
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) return { data: null };
    throw error;
  }
};

export const calculateProductAnalysisRequest = async (payload) => {
  const response = await apiClient.post("/price-analysis/calculate", payload, {
    timeout: 60 * 1000,
  });
  return response.data;
};

export const recalculateSurveyPeriodRequest = async (input) => {
  const payload = typeof input === "string" ? { surveyPeriodId: input } : input;
  if (!payload?.surveyPeriodId) {
    throw new Error("surveyPeriodId is required to recalculate analysis");
  }

  const response = await apiClient.post("/price-analysis/recalculate", payload, {
    timeout: 5 * 60 * 1000,
  });
  return response.data;
};

export const applyRecommendedPriceRequest = async (id) => {
  const response = await apiClient.post(`/price-analysis/apply-recommendation/${id}`);
  return response.data;
};

export const exportPriceAnalysisExcelRequest = async ({ surveyPeriodId } = {}) => {
  const response = await apiClient.get("/price-analysis/export/excel", {
    params: surveyPeriodId ? { surveyPeriodId } : {},
    responseType: "blob",
    timeout: 5 * 60 * 1000,
  });

  const disposition = response.headers?.["content-disposition"] || "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] || `price-analysis-${Date.now()}.xlsx`;

  return { blob: response.data, filename };
};
import { apiClient } from "../client.js";

/**
 * List price analyses with filters and pagination
 */
export const listPriceAnalysesRequest = async (params = {}) => {
  const response = await apiClient.get("/price-analysis", { params });
  console.log("listPriceAnalysesRequest response", response);
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
 * Calculate a single product's analysis.
 * Single-product calls are quick — 60s is plenty.
 */
export const calculateProductAnalysisRequest = async (payload) => {
  const response = await apiClient.post("/price-analysis/calculate", payload, {
    timeout: 60 * 1000,
  });
  return response.data;
};

/**
 * Batch recalculate an entire survey period.
 *
 * Body: { surveyPeriodId: string }
 * Accepts either a raw string or `{ surveyPeriodId }`.
 *
 * Long-running: loops over every assigned product. Give it up to 5 minutes.
 */
export const recalculateSurveyPeriodRequest = async (input) => {
  const surveyPeriodId = typeof input === "string" ? input : input?.surveyPeriodId;

  if (!surveyPeriodId) {
    throw new Error("surveyPeriodId is required to recalculate analysis");
  }

  const response = await apiClient.post(
    "/price-analysis/recalculate",
    { surveyPeriodId },
    { timeout: 5 * 60 * 1000 } // ← 5 minutes
  );
  console.log("response", response);
  return response.data;
};

/**
 * Download the price analysis Excel file.
 * Returns a Blob and the suggested filename.
 */
export const exportPriceAnalysisExcelRequest = async ({ surveyPeriodId } = {}) => {
  const response = await apiClient.get("/price-analysis/export/excel", {
    params: surveyPeriodId ? { surveyPeriodId } : {},
    responseType: "blob", // ← critical
    timeout: 5 * 60 * 1000,
  });

  // Try to extract the filename from the Content-Disposition header
  const disposition = response.headers?.["content-disposition"] || "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] || `price-analysis-${Date.now()}.xlsx`;

  return { blob: response.data, filename };
};

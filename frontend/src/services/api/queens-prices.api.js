import { apiClient } from "../client.js";

/**
 * List Queens prices across products with filters and pagination
 */
export const listQueensPricesRequest = async (params = {}) => {
  const response = await apiClient.get("/queens-prices", { params });
  return response.data;
};

/**
 * Get a single Queens price by ID
 */
export const getQueensPriceByIdRequest = async (id) => {
  const response = await apiClient.get(`/queens-prices/${id}`);
  return response.data;
};

/**
 * Get current (active) Queens price for a product
 * Returns null if no active price exists (404 handled gracefully)
 */
export const getCurrentQueensPriceRequest = async (productId) => {
  try {
    const response = await apiClient.get(`/products/${productId}/queens-prices/current`);
    return response.data;
  } catch (error) {
    if (error?.response?.status === 404) {
      return { data: null };
    }
    throw error;
  }
};

/**
 * Get Queens price effective at a specific date
 */
export const getQueensPriceAtDateRequest = async ({ productId, date }) => {
  const response = await apiClient.get(`/products/${productId}/queens-prices/at`, {
    params: { date },
  });
  return response.data;
};

/**
 * Get full history for a product
 */
export const getProductQueensPriceHistoryRequest = async ({ productId, params = {} }) => {
  const response = await apiClient.get(`/products/${productId}/queens-prices`, { params });
  return response.data;
};

/**
 * Create a new Queens price
 */
export const createQueensPriceRequest = async (payload) => {
  const response = await apiClient.post("/queens-prices", payload);
  return response.data;
};

/**
 * Update a Queens price
 */
export const updateQueensPriceRequest = async ({ id, payload }) => {
  const response = await apiClient.patch(`/queens-prices/${id}`, payload);
  return response.data;
};

/**
 * Delete a Queens price (ADMIN only, scheduled records only)
 */
export const deleteQueensPriceRequest = async (id) => {
  const response = await apiClient.delete(`/queens-prices/${id}`);
  return response.data;
};

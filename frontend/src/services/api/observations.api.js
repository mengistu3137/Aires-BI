import { apiClient } from "../client.js";

/**
 * Create an observation for an audit
 */
export const createObservationRequest = async ({ auditId, payload }) => {
  const response = await apiClient.post(`/audits/${auditId}/observations`, payload);
  return response.data;
};

/**
 * List observations for an audit with filters
 */
export const listAuditObservationsRequest = async ({ auditId, params = {} }) => {
  const response = await apiClient.get(`/audits/${auditId}/observations`, {
    params,
  });
  return response.data;
};

/**
 * Get single observation by ID
 */
export const getObservationByIdRequest = async (observationId) => {
  const response = await apiClient.get(`/observations/${observationId}`);
  return response.data;
};

/**
 * Update an existing observation
 */
export const updateObservationRequest = async ({ observationId, payload }) => {
  const response = await apiClient.patch(`/observations/${observationId}`, payload);
  return response.data;
};

/**
 * Approve observation (ADMIN/MANAGER)
 */
export const approveObservationRequest = async (observationId) => {
  const response = await apiClient.post(`/observations/${observationId}/approve`);
  return response.data;
};

/**
 * Reject observation with note (ADMIN/MANAGER)
 */
export const rejectObservationRequest = async ({ observationId, reviewNote }) => {
  const response = await apiClient.post(`/observations/${observationId}/reject`, { reviewNote });
  return response.data;
};

/**
 * Request review on observation (ADMIN/MANAGER)
 */
export const requestObservationReviewRequest = async ({ observationId, reviewNote }) => {
  const response = await apiClient.post(`/observations/${observationId}/request-review`, {
    reviewNote,
  });
  return response.data;
};

/**
 * List observations globally across all audits with filters and pagination.
 * Backend: GET /observations
 */
export const listObservationsRequest = async (params = {}) => {
  const response = await apiClient.get("/observations", { params });
  return response.data;
};

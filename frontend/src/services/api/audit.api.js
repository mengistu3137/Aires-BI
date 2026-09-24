import { apiClient } from "../client.js";

/**
 * Create a new audit from an assignment.
 * @param {{ assignmentId: string, notes?: string }} args
 */
export const createAuditRequest = async ({ assignmentId, notes }) => {
  const response = await apiClient.post(`/audits/assignments/${assignmentId}`, {
    notes,
  });
  return response.data;
};

/**
 * Get current active audit for the authenticated auditor.
 */
export const getCurrentAuditRequest = async () => {
  const response = await apiClient.get("/audits/current");
  return response.data;
};

/**
 * List audits with pagination and filters.
 * @param {object} params
 */
export const listAuditsRequest = async (params = {}) => {
  const response = await apiClient.get("/audits", { params });
  return response.data;
};

/**
 * Get audit history (completed audits).
 * @param {object} params
 */
export const getAuditHistoryRequest = async (params = {}) => {
  const response = await apiClient.get("/audits/history", { params });
  return response.data;
};

/**
 * Get a single audit by ID.
 * @param {string} auditId
 */
export const getAuditByIdRequest = async (auditId) => {
  const response = await apiClient.get(`/audits/${auditId}`);
  return response.data;
};

/**
 * Start an audit visit with GPS coordinates.
 * @param {{ auditId: string, payload: { latitude: number, longitude: number, accuracyMeters: number } }} args
 */
export const startAuditRequest = async ({ auditId, payload }) => {
  const response = await apiClient.post(`/audits/${auditId}/start`, payload);
  return response.data;
};

/**
 * Update audit notes (only while IN_PROGRESS).
 * @param {{ auditId: string, payload: { notes: string | null } }} args
 */
export const updateAuditRequest = async ({ auditId, payload }) => {
  const response = await apiClient.patch(`/audits/${auditId}`, payload);
  return response.data;
};

/**
 * Complete an audit visit with end GPS coordinates.
 * @param {{ auditId: string, payload: { latitude, longitude, accuracyMeters, notes? } }} args
 */
export const completeAuditRequest = async ({ auditId, payload }) => {
  const response = await apiClient.post(`/audits/${auditId}/complete`, payload);
  return response.data;
};

/**
 * Cancel an audit visit with a reason.
 * @param {{ auditId: string, payload: { reason: string } }} args
 */
export const cancelAuditRequest = async ({ auditId, payload }) => {
  const response = await apiClient.post(`/audits/${auditId}/cancel`, payload);
  return response.data;
};

/**
 * Mark audit for supervisor review (Manager/Admin only).
 * @param {{ auditId: string, payload: { reviewNote: string } }} args
 */
export const markAuditReviewRequest = async ({ auditId, payload }) => {
  const response = await apiClient.post(`/audits/${auditId}/mark-review`, payload);
  return response.data;
};

import { apiClient } from "../client.js";

/**
 * Create a new audit from an assignment
 */
export const createAuditRequest = async ({ assignmentId, notes }) => {
  const response = await apiClient.post(`/audits/assignments/${assignmentId}`, {
    notes,
  });
  return response.data;
};

/**
 * Get current active audit for the authenticated auditor
 */
export const getCurrentAuditRequest = async () => {
  const response = await apiClient.get("/audits/current");
  return response.data;
};

/**
 * List audits with pagination and filters
 */
export const listAuditsRequest = async (params = {}) => {
  const response = await apiClient.get("/audits", { params });
  return response.data;
};

/**
 * Get audit history (completed audits)
 */
export const getAuditHistoryRequest = async (params = {}) => {
  const response = await apiClient.get("/audits/history", { params });
  return response.data;
};

/**
 * Get a single audit by ID
 */
export const getAuditByIdRequest = async (auditId) => {
  const response = await apiClient.get(`/audits/${auditId}`);
  return response.data;
};

/**
 * Start an audit visit with GPS coordinates
 */
export const startAuditRequest = async ({ auditId, latitude, longitude, accuracyMeters }) => {
  const response = await apiClient.post(`/audits/${auditId}/start`, {
    latitude,
    longitude,
    accuracyMeters,
  });
  return response.data;
};

/**
 * Update audit notes (only while IN_PROGRESS)
 */
export const updateAuditRequest = async ({ auditId, notes }) => {
  const response = await apiClient.patch(`/audits/${auditId}`, { notes });
  return response.data;
};

/**
 * Complete an audit visit with end GPS coordinates
 */
export const completeAuditRequest = async ({
  auditId,
  latitude,
  longitude,
  accuracyMeters,
  notes,
}) => {
  const response = await apiClient.post(`/audits/${auditId}/complete`, {
    latitude,
    longitude,
    accuracyMeters,
    notes,
  });
  return response.data;
};

/**
 * Cancel an audit visit with a reason
 */
export const cancelAuditRequest = async ({ auditId, reason }) => {
  const response = await apiClient.post(`/audits/${auditId}/cancel`, {
    reason,
  });
  return response.data;
};

/**
 * Mark audit for supervisor review (Manager/Admin only)
 */
export const markAuditReviewRequest = async ({ auditId, reviewNote }) => {
  const response = await apiClient.post(`/audits/${auditId}/mark-review`, {
    reviewNote,
  });
  return response.data;
};

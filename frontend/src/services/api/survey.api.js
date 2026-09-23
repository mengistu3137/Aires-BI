import { apiClient } from "../client.js";

// ============================================================
// Survey Periods
// ============================================================

/**
 * Get the currently OPEN survey period.
 * Backend: GET /surveys/periods/active
 * Returns: { status, data: { period } }
 */
export const getActivePeriodRequest = async () => {
  const response = await apiClient.get("/surveys/periods/active");
  return response.data;
};

/**
 * Get all survey periods (for selectors / management pages).
 * Backend: GET /surveys/periods
 * Returns: { status, data: { periods } }
 *
 * ⚠️ Requires the backend route added below.
 */
export const getAllPeriodsRequest = async (params = {}) => {
  const response = await apiClient.get("/surveys/periods", { params });
  return response.data;
};

/**
 * Create a new survey period.
 * Backend: POST /surveys/periods
 * Returns: { status, data: { period } }
 */
export const createPeriodRequest = async (payload) => {
  const response = await apiClient.post("/surveys/periods", payload);
  return response.data;
};

// ============================================================
// Assignments
// ============================================================

/**
 * Get assignments. Field auditors automatically get their own.
 * Backend: GET /surveys/assignments
 * Returns: { status, results, data: { assignments } }
 */
export const getAssignmentsRequest = async (params = {}) => {
  const response = await apiClient.get("/surveys/assignments", { params });
  return response.data;
};

/**
 * Create a new assignment.
 * Backend: POST /surveys/assignments
 */
export const createAssignmentRequest = async (payload) => {
  const response = await apiClient.post("/surveys/assignments", payload);
  return response.data;
};

/**
 * Update assignment status.
 * Backend: PATCH /surveys/assignments/:id/status
 */
export const updateAssignmentStatusRequest = async (id, status) => {
  const response = await apiClient.patch(`/surveys/assignments/${id}/status`, {
    status,
  });
  return response.data;
};

// ============================================================
// Survey Entries (Field Submissions)
// ============================================================

/**
 * Submit a single field entry.
 * Backend: POST /surveys/entries
 */
export const submitSurveyEntryRequest = async (payload) => {
  const response = await apiClient.post("/surveys/entries", payload);
  return response.data;
};

/**
 * Batch-sync offline entries.
 * Backend: POST /surveys/sync
 */
export const syncBatchEntriesRequest = async (entries) => {
  const response = await apiClient.post("/surveys/sync", { entries });
  return response.data;
};

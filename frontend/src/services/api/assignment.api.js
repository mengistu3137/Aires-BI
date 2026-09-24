import { apiClient } from "@/services/client.js";

/**
 * Get assignments for the authenticated field auditor.
 * Backend: GET /assignments/mine
 */
export const getMyAssignmentsRequest = async () => {
  const response = await apiClient.get("/assignments/mine");
  return response.data;
};

/**
 * List all assignments (Admin / Manager).
 * Backend: GET /assignments
 */
export const getAllAssignmentsRequest = async (params = {}) => {
  const response = await apiClient.get("/assignments", { params });
  return response.data;
};

/**
 * Get a single assignment by ID.
 * Backend: GET /assignments/:id
 */
export const getAssignmentByIdRequest = async (id) => {
  const response = await apiClient.get(`/assignments/${id}`);
  return response.data;
};

/**
 * Create (dispatch) a new assignment.
 * Backend: POST /assignments
 * Body: { auditorId, storeId, surveyPeriodId, productIds[], status? }
 */
export const createAssignmentRequest = async (payload) => {
  const response = await apiClient.post("/assignments", payload);
  return response.data;
};

/**
 * Update an existing assignment.
 * Backend: PATCH /assignments/:id
 * Body: subset of { auditorId, storeId, surveyPeriodId, productIds[], status }
 */
export const updateAssignmentRequest = async ({ id, payload }) => {
  const response = await apiClient.patch(`/assignments/${id}`, payload);
  return response.data;
};

/**
 * Update only the status — used by field auditors.
 * Backend: PATCH /assignments/:id
 */
export const updateAssignmentStatusRequest = async (id, status) => {
  const response = await apiClient.patch(`/assignments/${id}`, { status });
  return response.data;
};

/**
 * Delete an assignment and its unstarted audit.
 * Backend: DELETE /assignments/:id
 */
export const deleteAssignmentRequest = async (id) => {
  const response = await apiClient.delete(`/assignments/${id}`);
  return response.data;
};

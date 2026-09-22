import { apiClient } from "@/services/client.js";

/**
 * Fetch assignments specifically assigned to the logged-in field auditor
 * Includes store GPS coordinates, competitor details, and assigned items checklist
 */
export const getMyAssignmentsRequest = async () => {
    const response = await apiClient.get("/assignments/mine");
    return response.data;
};

/**
 * Fetch all assignments with optional query filters (Manager/Admin)
 */
export const getAllAssignmentsRequest = async (params = {}) => {
    const response = await apiClient.get("/assignments", { params });
    return response.data;
};

/**
 * Dispatch a new assignment for an auditor, store, and weekly period
 */
export const createAssignmentRequest = async (payload) => {
    const response = await apiClient.post("/assignments", payload);
    return response.data;
};

/**
 * Update an assignment's status (NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED)
 */
export const updateAssignmentStatusRequest = async (id, status) => {
    const response = await apiClient.patch(`/assignments/${id}`, { status });
    return response.data;
};
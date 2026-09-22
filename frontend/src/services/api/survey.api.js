import { apiClient } from "../client.js";

export const getActivePeriodRequest = async () => {
    const response = await apiClient.get("/surveys/periods/active");
    return response.data;
};

export const getAssignmentsRequest = async (params = {}) => {
    const response = await apiClient.get("/surveys/assignments", { params });
    return response.data;
};

export const submitSurveyEntryRequest = async (payload) => {
    const response = await apiClient.post("/surveys/entries", payload);
    return response.data;
};

export const syncBatchEntriesRequest = async (entries) => {
    const response = await apiClient.post("/surveys/sync", { entries });
    return response.data;
};

export const updateAssignmentStatusRequest = async (id, status) => {
    const response = await apiClient.patch(`/surveys/assignments/${id}/status`, { status });
    return response.data;
};
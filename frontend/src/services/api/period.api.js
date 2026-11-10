import { apiClient } from "@/services/client.js";

export const getActivePeriodRequest = async () => {
    const response = await apiClient.get("/survey-periods/active");
    return response.data;
};

export const getAllPeriodsRequest = async () => {
    const response = await apiClient.get("/survey-periods");
    return response.data;
};

export const createPeriodRequest = async (payload) => {
    const response = await apiClient.post("/survey-periods", payload);
    return response.data;
};

export const updatePeriodStatusRequest = async (id, status) => {
    const response = await apiClient.patch(`/survey-periods/${id}`, { status });
    return response.data;
};

export const updatePeriodRequest = async (id, data) => {
    const response = await apiClient.put(`/survey-periods/${id}`, data);
    return response.data;
};

export const deletePeriodRequest = async (id) => {
    const response = await apiClient.delete(`/survey-periods/${id}`);
    return response.data;
};
import { apiClient } from "@/services/client.js";

export const getBIDashboardRequest = async (params = {}) => {
    const response = await apiClient.get("/bi/dashboard", { params });
    return response.data;
};

export const getBIExportRequest = async (periodId) => {
    const response = await apiClient.get("/bi/export", {
        params: { periodId },
    });
    return response.data;
};
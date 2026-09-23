import { apiClient } from "@/services/client.js";

export const getStoresRequest = async (params = {}) => {
    const response = await apiClient.get("/stores", { params });
    return response.data;
};

export const getStoreByIdRequest = async (id) => {
    const response = await apiClient.get(`/stores/${id}`);
    return response.data;
};

export const createStoreRequest = async (payload) => {
    const response = await apiClient.post("/stores", payload);
    return response.data;
};

export const updateStoreRequest = async (id, payload) => {
    const response = await apiClient.patch(`/stores/${id}`, payload);
    return response.data;
};
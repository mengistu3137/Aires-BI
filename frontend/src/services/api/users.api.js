import { apiClient } from "../client.js";

export const getUsersRequest = async (params = {}) => {
    const response = await apiClient.get("/users", { params });
    return response.data;
};

export const createUserRequest = async (userData) => {
    const response = await apiClient.post("/users", userData);
    return response.data;
};

export const updateUserRequest = async ({ id, updates }) => {
    const response = await apiClient.patch(`/users/${id}`, updates);
    return response.data;
};
export const deleteUserRequest = async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
};
import { apiClient } from "../client.js";

export const loginRequest = async (credentials) => {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data;
};

export const getCurrentUserRequest = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};

/**
 * Super Admin generates session token on behalf of a target user
 */
export const impersonateUserRequest = async (userId) => {
  const response = await apiClient.post(`/auth/impersonate/${userId}`);
  return response.data;
};
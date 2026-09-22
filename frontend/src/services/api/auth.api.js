import { apiClient } from "../client.js";

/**
 * Sends login credentials (phone/email + password) to Aires-BI Backend
 */
export const loginRequest = async (credentials) => {
  const response = await apiClient.post("/auth/login", credentials);
  return response.data;
};

/**
 * Retrieves the currently authenticated user's profile and active territories
 */
export const getCurrentUserRequest = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};
import axios from "axios";
import { setupInterceptors } from "./interceptors.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // Raised from 15s → 30s to accommodate slower networks and heavier endpoints.
  // Individual long-running operations can override this per request.
  timeout: 30 * 1000,
  headers: {
    "Content-Type": "application/json",
  },
});

setupInterceptors(apiClient);

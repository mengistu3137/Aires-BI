import { useAuthStore } from "@/stores/auth/auth.store.js";

export const setupInterceptors = (client) => {
  // 1. Request Interceptor: Injects active Bearer Token
  client.interceptors.request.use(
    (config) => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // 2. Response Interceptor: 401 Session Handling & Normalization
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response && error.response.status === 401) {
        // Automatically revoke session on token expiration
        useAuthStore.getState().clearAuth();
      }

      let data = error.response?.data;
      if (typeof Blob !== "undefined" && data instanceof Blob) {
        try {
          const text = await data.text();
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }
      }

      const normalizedError = {
        message:
          data?.message ||
          error.message ||
          "An unexpected network error occurred",
        status: error.response?.status,
        errors: data?.errors || [],
      };

      return Promise.reject(normalizedError);
    }
  );
};
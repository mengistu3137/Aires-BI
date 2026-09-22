import { useMutation } from "@tanstack/react-query";
import { loginRequest } from "@/services/api/auth.api.js";
import { useAuth } from "@/hooks/useAuth.js";
import toast from "react-hot-toast";

export const useLogin = (onNavigate) => {
  const { login: setAuth } = useAuth();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (response) => {
      const payload = response?.data;

      if (!payload || !payload.token || !payload.user) {
        toast.error("Invalid response from server");
        return;
      }

      // Store in Zustand & local storage
      setAuth({
        user: payload.user,
        token: payload.token,
      });

      toast.success(`Welcome back, ${payload.user.name}`);

      // Role-based routing
      if (onNavigate) {
        if (payload.user.role === "FIELD_AUDITOR") {
          onNavigate("/survey");
        } else {
          onNavigate("/dashboard");
        }
      }
    },
    onError: (error) => {
      console.error("[useLogin] Authentication failed:", error);
    },
  });
};
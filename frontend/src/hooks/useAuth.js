import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth/auth.store.js";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const activeAssignmentId = useAuthStore((state) => state.activeAssignmentId);

  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const setActiveAssignmentId = useAuthStore((state) => state.setActiveAssignmentId);

  const logout = () => {
    clearAuth();
  };

  const role = user?.role;

  // Queens Admin is strictly view-only
  const isQueensAdmin =
    role === "QUEENS_ADMIN" ||
    role === "QUEENS" ||
    (Boolean(user?.organization?.toLowerCase().includes("queens")) && role === "ADMIN");

  const isAdmin = role === "ADMIN" && !isQueensAdmin;
  const isManager = (role === "MANAGER" || role === "ADMIN") && !isQueensAdmin;
  const isAuditor = role === "FIELD_AUDITOR";

  return useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      isInitialized,
      activeAssignmentId,
      role,
      isAdmin,
      isManager,
      isAuditor,
      isQueensAdmin,

      login: setAuth,
      logout,

      setUser,
      updateUser,
      setInitialized,
      setActiveAssignmentId,
    }),
    [
      user,
      accessToken,
      isAuthenticated,
      isInitialized,
      activeAssignmentId,
      role,
      isAdmin,
      isManager,
      isAuditor,
      isQueensAdmin,
      setAuth,
      setUser,
      updateUser,
      setInitialized,
      setActiveAssignmentId,
      clearAuth,
    ]
  );
}
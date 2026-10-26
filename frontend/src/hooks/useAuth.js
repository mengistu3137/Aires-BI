import { useMemo } from "react";
import { useAuthStore } from "@/stores/auth/auth.store.js";

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const activeAssignmentId = useAuthStore((state) => state.activeAssignmentId);
  const isImpersonating = useAuthStore((state) => state.isImpersonating);
  const impersonatorSession = useAuthStore((state) => state.impersonatorSession);

  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setUser = useAuthStore((state) => state.setUser);
  const updateUser = useAuthStore((state) => state.updateUser);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const setActiveAssignmentId = useAuthStore((state) => state.setActiveAssignmentId);
  const impersonate = useAuthStore((state) => state.impersonate);
  const stopImpersonation = useAuthStore((state) => state.stopImpersonation);

  const logout = () => {
    clearAuth();
  };

  const role = user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isAiresAdmin = role === "ADMIN";
  const isAdmin = isSuperAdmin || isAiresAdmin;
  const isQueensAdmin = role === "MANAGER";
  const isManager = isQueensAdmin || isAdmin;
  const isAuditor = role === "FIELD_AUDITOR";

  // Only Aires Super Admin can sign in as another user
  const canImpersonate = isSuperAdmin || Boolean(impersonatorSession);

  return useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated,
      isInitialized,
      activeAssignmentId,
      role,

      // 4 Distinct Role Checks
      isSuperAdmin,
      isAiresAdmin,
      isAdmin,
      isQueensAdmin,
      isManager,
      isAuditor,

      // Impersonation Capabilities
      canImpersonate,
      isImpersonating: Boolean(isImpersonating),
      impersonator: impersonatorSession?.impersonator || null,
      impersonatorSession,
      impersonate,
      stopImpersonation,

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
      isSuperAdmin,
      isAiresAdmin,
      isAdmin,
      isQueensAdmin,
      isManager,
      isAuditor,
      canImpersonate,
      isImpersonating,
      impersonatorSession,
      impersonate,
      stopImpersonation,
      setAuth,
      setUser,
      updateUser,
      setInitialized,
      setActiveAssignmentId,
      clearAuth,
    ]
  );
}
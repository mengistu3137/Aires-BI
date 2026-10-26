import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: false,

      // Active auditor context for field assignments
      activeAssignmentId: null,

      // Impersonation state
      impersonatorSession: null,
      isImpersonating: false,

      setAuth: ({ user, token }) => {
        if (!user || !token) {
          console.error("[Aires-BI AuthStore] setAuth called with invalid payload:", {
            user,
            token,
          });
          return;
        }

        set({
          user: user ?? null,
          accessToken: token ?? null,
          isAuthenticated: Boolean(user && token),
        });
      },

      // Super Admin switches into target user session
      impersonate: ({ targetUser, token, impersonator }) => {
        const state = get();
        set({
          impersonatorSession: state.impersonatorSession || {
            user: state.user,
            token: state.accessToken,
            impersonator,
          },
          user: targetUser,
          accessToken: token,
          isAuthenticated: true,
          isImpersonating: true,
          activeAssignmentId: null,
        });
      },

      // Restores the original Super Admin session
      stopImpersonation: () => {
        const state = get();
        if (!state.impersonatorSession) return;

        set({
          user: state.impersonatorSession.user,
          accessToken: state.impersonatorSession.token,
          impersonatorSession: null,
          isImpersonating: false,
          isAuthenticated: true,
          activeAssignmentId: null,
        });
      },

      setUser: (user) => set({ user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setActiveAssignmentId: (activeAssignmentId) => set({ activeAssignmentId }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          activeAssignmentId: null,
          impersonatorSession: null,
          isImpersonating: false,
        }),

      setInitialized: (isInitialized) => set({ isInitialized }),
    }),
    {
      name: "aires-bi-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        activeAssignmentId: state.activeAssignmentId,
        impersonatorSession: state.impersonatorSession,
        isImpersonating: state.isImpersonating,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setInitialized(true);
      },
    }
  )
);
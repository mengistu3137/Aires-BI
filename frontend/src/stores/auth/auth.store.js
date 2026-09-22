import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: false,

      // Active auditor context for field assignments
      activeAssignmentId: null,

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

      setUser: (user) =>
        set({
          user,
        }),

      setAccessToken: (token) =>
        set({
          accessToken: token,
        }),

      setActiveAssignmentId: (activeAssignmentId) =>
        set({
          activeAssignmentId,
        }),

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
        }),

      setInitialized: (isInitialized) =>
        set({
          isInitialized,
        }),
    }),
    {
      name: "aires-bi-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        activeAssignmentId: state.activeAssignmentId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setInitialized(true);
      },
    }
  )
);
import React, { useEffect } from "react";
import { MutationCache, QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth.js";
import { getCurrentUserRequest } from "@/services/api/auth.api.js";
import { useObservationQueueInvalidator } from "@/features/observations/hooks/useObservationQueueInvalidator.js";
import { useObservationQueueFlush } from "@/features/observations/hooks/useObservationQueueFlush.js";

// Global TanStack Query Client with deduplicated toasts
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipGlobalToast) return;

      const message =
        error?.displayMessage ||
        error?.message ||
        "An unexpected error occurred while communicating with Aires-BI.";

      toast.error(message, { id: message });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

/**
 * Restores user session without screen flicker.
 */
const SessionRestoreBootstrap = ({ children }) => {
  const { accessToken, isInitialized, setInitialized, setUser, logout } = useAuth();

  const {
    data: responseData,
    isError,
    isSuccess,
    isLoading,
  } = useQuery({
    queryKey: ["currentUser", accessToken],
    queryFn: getCurrentUserRequest,
    enabled: !isInitialized && Boolean(accessToken),
    retry: false,
  });

  // Case A: No token stored, mark initialized immediately
  useEffect(() => {
    if (!accessToken) {
      setInitialized(true);
    }
  }, [accessToken, setInitialized]);

  // Case B: Token validated successfully
  useEffect(() => {
    if (isSuccess && responseData) {
      const resolvedUser = responseData.data?.user || responseData.user;
      setUser(resolvedUser);
      setInitialized(true);
    }
  }, [isSuccess, responseData, setUser, setInitialized]);

  // Case C: Stale or invalid token
  useEffect(() => {
    if (isError) {
      logout();
      setInitialized(true);
    }
  }, [isError, logout, setInitialized]);

  if (!isInitialized && accessToken && isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
          <p className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
            Initializing Aires-BI...
          </p>
        </div>
      </div>
    );
  }

  return children;
};

/**
 * Subscribes to observation queue events (sync success/failure) and
 * flushes the offline queue on reconnect.
 *
 * Mounted once inside QueryClientProvider so it has access to the client.
 * Renders nothing — purely a side-effect wrapper.
 */
const ObservationQueueSync = ({ children }) => {
  useObservationQueueInvalidator();
  useObservationQueueFlush();
  return children;
};

export const AppProviders = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: "0.75rem",
            background: "#FFFFFF",
            color: "#1E293B",
            fontSize: "13px",
            fontWeight: "500",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
          },
          // 🟢 Aires Green Secondary Theme
          success: {
            iconTheme: {
              primary: "#017C4D",
              secondary: "#FFFFFF",
            },
          },
          // 🔴 Aires Red Primary Theme
          error: {
            iconTheme: {
              primary: "#A41821",
              secondary: "#FFFFFF",
            },
          },
          // 🟠 Aires Orange Accent
          loading: {
            iconTheme: {
              primary: "#FE7914",
              secondary: "#FFFFFF",
            },
          },
        }}
      />
      <ObservationQueueSync>
        <SessionRestoreBootstrap>{children}</SessionRestoreBootstrap>
      </ObservationQueueSync>
    </QueryClientProvider>
  );
};

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getActivePeriodRequest,
  getAllPeriodsRequest,
  createPeriodRequest,
  updatePeriodStatusRequest,
} from "@/services/api/period.api.js";

/**
 * Active (OPEN) survey period.
 * Backend: GET /survey-periods/active -> { data: { period } }
 */
export const useActivePeriod = () => {
  return useQuery({
    queryKey: ["surveyPeriods", "active"],
    queryFn: async () => {
      const res = await getActivePeriodRequest();
      return res?.data?.period || res?.data || null;
    },
    staleTime: 60 * 1000,
  });
};

/**
 * All survey periods (list).
 * Backend: GET /survey-periods -> { data: { periods } }
 */
export const useAllPeriods = () => {
  return useQuery({
    queryKey: ["surveyPeriods", "all"],
    queryFn: async () => {
      const res = await getAllPeriodsRequest();
      return res?.data?.periods || res?.data || [];
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Create a new survey period.
 * Backend: POST /survey-periods
 */
export const useCreatePeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPeriodRequest,
    onSuccess: (data) => {
      toast.success(data?.message || "Survey cycle created successfully");
      queryClient.invalidateQueries({ queryKey: ["surveyPeriods"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to create survey period");
    },
  });
};

/**
 * Update survey period status (e.g. OPEN <-> CLOSED).
 * Backend: PATCH /survey-periods/:id
 */
export const useUpdatePeriodStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => updatePeriodStatusRequest(id, status),
    onSuccess: (data, variables) => {
      toast.success(data?.message || `Survey cycle status updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ["surveyPeriods"] });
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update cycle status");
    },
  });
};

/**
 * Composite hook: exports activePeriod, periods, createPeriod, and updateStatus.
 */
export const usePeriods = () => {
  const activeQuery = useActivePeriod();
  const allQuery = useAllPeriods();
  const createPeriodMutation = useCreatePeriod();
  const updateStatusMutation = useUpdatePeriodStatus();

  return {
    activePeriod: activeQuery.data,
    periods: allQuery.data || [],
    isLoading: activeQuery.isLoading || allQuery.isLoading,
    isError: activeQuery.isError || allQuery.isError,
    createPeriod: createPeriodMutation.mutateAsync,
    isCreating: createPeriodMutation.isPending,
    // Fix: Export updateStatus function
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
  };
};
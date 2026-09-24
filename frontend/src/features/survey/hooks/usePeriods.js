import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getActivePeriodRequest,
  getAllPeriodsRequest,
  createPeriodRequest,
} from "@/services/api/survey.api.js";

/**
 * Active (OPEN) survey period.
 * Backend: GET /surveys/periods/active → { data: { period } }
 */
export const useActivePeriod = () => {
  return useQuery({
    queryKey: ["surveyPeriods", "active"],
    queryFn: async () => {
      const res = await getActivePeriodRequest();
      return res?.data?.period || null;
    },
    staleTime: 60 * 1000,
  });
};

/**
 * All survey periods (list).
 * Backend: GET /surveys/periods → { data: { periods } }
 */
export const useAllPeriods = () => {
  return useQuery({
    queryKey: ["surveyPeriods", "all"],
    queryFn: async () => {
      const res = await getAllPeriodsRequest();
      return res?.data?.periods || [];
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Create a new survey period.
 * Backend: POST /surveys/periods
 */
export const useCreatePeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPeriodRequest,
    onSuccess: () => {
      toast.success("Survey cycle created successfully");
      queryClient.invalidateQueries({ queryKey: ["surveyPeriods"] });
    },
    onError: (err) => {
      toast.error(err?.message || "Failed to create survey period");
    },
  });
};

/**
 * Convenience composite hook.
 * Keeps backward compatibility with existing callers of `usePeriods()`.
 */
export const usePeriods = () => {
  const activeQuery = useActivePeriod();
  const allQuery = useAllPeriods();
  const createPeriodMutation = useCreatePeriod();

  return {
    activePeriod: activeQuery.data,
    periods: allQuery.data || [],
    isLoading: activeQuery.isLoading || allQuery.isLoading,
    isError: activeQuery.isError || allQuery.isError,
    createPeriod: createPeriodMutation.mutateAsync,
    isCreating: createPeriodMutation.isPending,
  };
};

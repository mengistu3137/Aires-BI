import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  resolveAlertRequest,
  generateAlertsForSurveyPeriodRequest,
  generateAlertForAnalysisRequest,
} from "@/services/api/alerts.api.js";

/**
 * Invalidate all alert-related queries
 */
const invalidateAlertQueries = (queryClient, alertId) => {
  queryClient.invalidateQueries({ queryKey: ["alerts", "list"] });
  queryClient.invalidateQueries({ queryKey: ["alerts", "active"] });
  if (alertId) {
    queryClient.invalidateQueries({
      queryKey: ["alerts", "detail", alertId],
    });
  }
  // Dashboard metrics may consume alert data
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
};

/**
 * Resolve an alert (ADMIN/MANAGER)
 */
export const useResolveAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resolveAlertRequest,
    onSuccess: (data) => {
      toast.success("Alert resolved successfully");
      invalidateAlertQueries(queryClient, data?.data?.id);
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Trigger batch alert generation for a survey period (ADMIN/MANAGER)
 */
export const useGenerateAlertsForSurveyPeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateAlertsForSurveyPeriodRequest,
    onSuccess: (data) => {
      const count = data?.data?.alertsGeneratedCount ?? 0;
      toast.success(`Generated ${count} alert${count === 1 ? "" : "s"} for this survey period`);
      invalidateAlertQueries(queryClient);
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Trigger alert evaluation for a single PriceAnalysis (ADMIN/MANAGER)
 */
export const useGenerateAlertForAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateAlertForAnalysisRequest,
    onSuccess: (data) => {
      if (data?.data) {
        toast.success("Alert created or updated");
      } else {
        toast.success("No alert condition required for this analysis");
      }
      invalidateAlertQueries(queryClient, data?.data?.id);
    },
    meta: { skipGlobalToast: true },
  });
};

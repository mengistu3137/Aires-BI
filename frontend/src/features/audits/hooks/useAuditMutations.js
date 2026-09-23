import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createAuditRequest,
  startAuditRequest,
  updateAuditRequest,
  completeAuditRequest,
  cancelAuditRequest,
  markAuditReviewRequest,
} from "@/services/api/audit.api.js";

/**
 * Invalidate all audit-related queries
 */
const invalidateAuditQueries = (queryClient, auditId) => {
  queryClient.invalidateQueries({ queryKey: ["audits"] });
  if (auditId) {
    queryClient.invalidateQueries({ queryKey: ["audits", "detail", auditId] });
  }
  queryClient.invalidateQueries({ queryKey: ["assignments"] });
};

/**
 * Hook for creating an audit from an assignment
 */
export const useCreateAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAuditRequest,
    onSuccess: (data) => {
      toast.success("Audit visit initialized");
      invalidateAuditQueries(queryClient, data?.data?.id);
    },
  });
};

/**
 * Hook for starting an audit visit
 */
export const useStartAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startAuditRequest,
    onSuccess: (data) => {
      toast.success("Audit visit started");
      invalidateAuditQueries(queryClient, data?.data?.id);
    },
  });
};

/**
 * Hook for updating audit notes
 */
export const useUpdateAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAuditRequest,
    onSuccess: (data) => {
      toast.success("Audit updated");
      invalidateAuditQueries(queryClient, data?.data?.id);
    },
  });
};

/**
 * Hook for completing an audit visit
 */
export const useCompleteAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeAuditRequest,
    onSuccess: (data) => {
      toast.success("Audit visit completed");
      invalidateAuditQueries(queryClient, data?.data?.id);
    },
    meta: {
      skipGlobalToast: true, // Handle errors locally for better UX
    },
  });
};

/**
 * Hook for cancelling an audit visit
 */
export const useCancelAudit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelAuditRequest,
    onSuccess: (data) => {
      toast.success("Audit visit cancelled");
      invalidateAuditQueries(queryClient, data?.data?.id);
    },
  });
};

/**
 * Hook for marking audit for supervisor review
 */
export const useMarkAuditReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAuditReviewRequest,
    onSuccess: (data) => {
      toast.success("Audit marked for review");
      invalidateAuditQueries(queryClient, data?.data?.id);
    },
  });
};

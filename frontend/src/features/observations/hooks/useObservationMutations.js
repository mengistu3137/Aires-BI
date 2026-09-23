import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createObservationRequest,
  updateObservationRequest,
  approveObservationRequest,
  rejectObservationRequest,
  requestObservationReviewRequest,
} from "@/services/api/observations.api.js";

/**
 * Invalidate observation-related queries
 */
const invalidateObservationQueries = (queryClient, auditId, observationId) => {
  if (auditId) {
    queryClient.invalidateQueries({
      queryKey: ["observations", "audit", auditId],
    });
    queryClient.invalidateQueries({
      queryKey: ["audits", "detail", auditId],
    });
    queryClient.invalidateQueries({ queryKey: ["audits"] });
  }
  if (observationId) {
    queryClient.invalidateQueries({
      queryKey: ["observations", "detail", observationId],
    });
  }
};

/**
 * Create a new observation
 */
export const useCreateObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createObservationRequest,
    onSuccess: (data, variables) => {
      toast.success("Observation saved");
      invalidateObservationQueries(queryClient, variables?.auditId, data?.data?.id);
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Update an existing observation
 */
export const useUpdateObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateObservationRequest,
    onSuccess: (data) => {
      toast.success("Observation updated");
      invalidateObservationQueries(queryClient, data?.data?.auditId, data?.data?.id);
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Approve observation (ADMIN/MANAGER)
 */
export const useApproveObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveObservationRequest,
    onSuccess: (data) => {
      toast.success("Observation approved");
      invalidateObservationQueries(queryClient, data?.data?.auditId, data?.data?.id);
    },
  });
};

/**
 * Reject observation with note (ADMIN/MANAGER)
 */
export const useRejectObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectObservationRequest,
    onSuccess: (data) => {
      toast.success("Observation rejected");
      invalidateObservationQueries(queryClient, data?.data?.auditId, data?.data?.id);
    },
  });
};

/**
 * Request review on observation (ADMIN/MANAGER)
 */
export const useRequestObservationReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestObservationReviewRequest,
    onSuccess: (data) => {
      toast.success("Observation flagged for review");
      invalidateObservationQueries(queryClient, data?.data?.auditId, data?.data?.id);
    },
  });
};

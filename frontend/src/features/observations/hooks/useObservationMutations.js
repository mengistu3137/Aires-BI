import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createObservationRequest,
  updateObservationRequest,
  approveObservationRequest,
  rejectObservationRequest,
  requestObservationReviewRequest,
} from "@/services/api/observations.api.js";

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

export const useCreateObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createObservationRequest,
    onSuccess: (data, variables) => {
      toast.success("Observation saved", {
        id: "observation-action-toast",
        duration: 1200,
      });
      invalidateObservationQueries(queryClient, variables?.auditId, data?.data?.id);
    },
    meta: { skipGlobalToast: true },
  });
};

export const useUpdateObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateObservationRequest,
    onSuccess: (data) => {
      toast.success("Observation updated", {
        id: "observation-action-toast",
        duration: 1200,
      });
      invalidateObservationQueries(queryClient, data?.data?.auditId, data?.data?.id);
    },
    meta: { skipGlobalToast: true },
  });
};

export const useApproveObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveObservationRequest,
    onSuccess: (data) => {
      toast.success("Observation approved ✓", {
        id: "observation-review-toast",
        duration: 1200,
      });
      invalidateObservationQueries(queryClient, data?.data?.auditId, data?.data?.id);
    },
  });
};

export const useRejectObservation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectObservationRequest,
    onSuccess: (data) => {
      toast.success("Observation rejected ✕", {
        id: "observation-review-toast",
        duration: 1200,
      });
      invalidateObservationQueries(queryClient, data?.data?.auditId, data?.data?.id);
    },
  });
};

export const useRequestObservationReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: requestObservationReviewRequest,
    onSuccess: (data) => {
      toast.success("Observation flagged for review", {
        id: "observation-review-toast",
        duration: 1200,
      });
      invalidateObservationQueries(queryClient, data?.data?.auditId, data?.data?.id);
    },
  });
};
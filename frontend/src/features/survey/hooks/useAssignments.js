import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyAssignmentsRequest,
  getAllAssignmentsRequest,
  createAssignmentRequest,
  updateAssignmentRequest,
  updateAssignmentStatusRequest,
  deleteAssignmentRequest,
} from "@/services/api/assignment.api.js";
import { useAuth } from "@/hooks/useAuth.js";
import toast from "react-hot-toast";

/**
 * Fetch assignments. Role-aware:
 *   - FIELD_AUDITOR → GET /assignments/mine
 *   - ADMIN/MANAGER → GET /assignments with filters
 */
export const useAssignments = (filters = {}) => {
  const { isAuditor } = useAuth();

  const queryKey = isAuditor ? ["assignments", "mine"] : ["assignments", "all", filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (isAuditor) {
        const res = await getMyAssignmentsRequest();
        return res?.data?.assignments || [];
      }
      const res = await getAllAssignmentsRequest(filters);
      return res?.data?.assignments || [];
    },
    staleTime: 60 * 1000,
  });
};

const invalidate = (queryClient) => {
  queryClient.invalidateQueries({ queryKey: ["assignments"] });
  queryClient.invalidateQueries({ queryKey: ["audits"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
};

/**
 * Dispatch a new assignment (Admin / Manager).
 */
export const useCreateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAssignmentRequest,
    onSuccess: () => {
      toast.success("Assignment dispatched");
      invalidate(queryClient);
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Update an existing assignment (Admin / Manager).
 */
export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAssignmentRequest,
    onSuccess: () => {
      toast.success("Assignment updated");
      invalidate(queryClient);
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Update only assignment status (field auditor or manager).
 */
export const useUpdateAssignmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => updateAssignmentStatusRequest(id, status),
    onSuccess: () => {
      toast.success("Assignment status updated");
      invalidate(queryClient);
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Delete an assignment (Admin / Manager).
 * Only allowed when no visit has started.
 */
export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAssignmentRequest,
    onSuccess: () => {
      toast.success("Assignment deleted");
      invalidate(queryClient);
    },
    meta: { skipGlobalToast: true },
  });
};

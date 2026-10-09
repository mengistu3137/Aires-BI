import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyAssignmentsRequest,
  getAllAssignmentsRequest,
  createAssignmentRequest,
  updateAssignmentRequest,
  updateAssignmentStatusRequest,
  deleteAssignmentRequest,
  createBatchAssignmentRequest,
  updateStoreAllocationsRequest,
} from "@/services/api/assignment.api.js";
import { useAuth } from "@/hooks/useAuth.js";
import toast from "react-hot-toast";

export const useCreateBatchAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBatchAssignmentRequest,
    onSuccess: () => {
      toast.success("All assignments dispatched successfully");
      invalidate(queryClient);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        "Failed to dispatch assignments",
      );
    },
  });
};

export const useUpdateStoreAllocations = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateStoreAllocationsRequest,
    onSuccess: () => {
      toast.success("Store allocations updated successfully");
      invalidate(queryClient);
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message ||
        err.message ||
        "Failed to update allocations",
      );
    },
  });
};

/**
 * Fetch assignments. Role-aware:
 *   - FIELD_AUDITOR → GET /assignments/mine   (not paginated)
 *   - ADMIN/MANAGER → GET /assignments with filters + pagination
 *
 * Returns the full response object so the caller can read `meta`:
 *   {
 *     assignments: [...],
 *     meta: { page, limit, total, totalPages }
 *   }
 *
 * Auditors get a synthetic meta so callers can treat both shapes
 * uniformly without branching.
 */
export const useAssignments = (filters = {}) => {
  const { isAuditor } = useAuth();

  // Pull pagination keys out of filters so a nullish limit/page never
  // sends an empty query string. Backend clamps to [1, 100] anyway.
  const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
  const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 20;

  const queryKey = isAuditor
    ? ["assignments", "mine"]
    : ["assignments", "all", { ...filters, page, limit }];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (isAuditor) {
        const res = await getMyAssignmentsRequest();
        const assignments = res?.data?.assignments || [];
        return {
          assignments,
          meta: {
            page: 1,
            limit: assignments.length || 1,
            total: assignments.length,
            totalPages: 1,
          },
        };
      }

      const res = await getAllAssignmentsRequest({ ...filters, page, limit });
      // Controller returns: { status, results, data: { assignments }, meta }
      return {
        assignments: res?.data?.assignments || [],
        meta:
          res?.meta || {
            page,
            limit,
            total: 0,
            totalPages: 1,
          },
      };
    },
    staleTime: 60 * 1000,
    // Keep the previous page visible while fetching the next one —
    // prevents the grid from collapsing to a spinner on every page change.
    placeholderData: (prev) => prev,
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
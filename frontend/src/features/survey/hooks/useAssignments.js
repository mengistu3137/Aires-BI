import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getMyAssignmentsRequest,
    getAllAssignmentsRequest,
    createAssignmentRequest,
    updateAssignmentStatusRequest,
} from "@/services/api/assignment.api.js";
import { useAuth } from "@/hooks/useAuth.js";
import toast from "react-hot-toast";

/**
 * Hook for fetching and managing survey assignments based on user role
 */
export const useAssignments = (filters = {}) => {
    const queryClient = useQueryClient();
    const { isAuditor } = useAuth();

    // 1. Query: Auditors fetch /mine, Managers fetch /
    const queryKey = isAuditor ? ["assignments", "mine"] : ["assignments", "all", filters];

    const assignmentsQuery = useQuery({
        queryKey,
        queryFn: async () => {
            try {
                if (isAuditor) {
                    const res = await getMyAssignmentsRequest();
                    return res?.data?.assignments || [];
                }
                const res = await getAllAssignmentsRequest(filters);
                return res?.data?.assignments || [];
            } catch (err) {
                console.warn("Failed to fetch assignments from API:", err.message);
                return [];
            }
        },
        staleTime: 60 * 1000,
    });

    // 2. Mutation: Dispatch new assignment (Manager/Admin)
    const createAssignmentMutation = useMutation({
        mutationFn: createAssignmentRequest,
        onSuccess: () => {
            toast.success("Assignment dispatched successfully");
            queryClient.invalidateQueries({ queryKey: ["assignments"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to create assignment");
        },
    });

    // 3. Mutation: Update assignment status
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => updateAssignmentStatusRequest(id, status),
        onSuccess: () => {
            toast.success("Assignment status updated");
            queryClient.invalidateQueries({ queryKey: ["assignments"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update assignment status");
        },
    });

    return {
        assignments: assignmentsQuery.data || [],
        isLoading: assignmentsQuery.isLoading,
        isError: assignmentsQuery.isError,
        createAssignment: createAssignmentMutation.mutateAsync,
        isCreating: createAssignmentMutation.isPending,
        updateStatus: updateStatusMutation.mutateAsync,
        isUpdating: updateStatusMutation.isPending,
        refetch: assignmentsQuery.refetch,
    };
};
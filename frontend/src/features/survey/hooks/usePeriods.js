import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getActivePeriodRequest,
    getAllPeriodsRequest,
    createPeriodRequest,
    updatePeriodStatusRequest,
} from "@/services/api/period.api.js";
import toast from "react-hot-toast";

export const usePeriods = () => {
    const queryClient = useQueryClient();

    const activePeriodQuery = useQuery({
        queryKey: ["surveyPeriods", "active"],
        queryFn: async () => {
            const res = await getActivePeriodRequest();
            return res?.data?.period || null;
        },
        staleTime: 60 * 1000,
    });

    const allPeriodsQuery = useQuery({
        queryKey: ["surveyPeriods", "all"],
        queryFn: async () => {
            const res = await getAllPeriodsRequest();
            return res?.data?.periods || [];
        },
        staleTime: 60 * 1000,
    });

    const createPeriodMutation = useMutation({
        mutationFn: createPeriodRequest,
        onSuccess: () => {
            toast.success("Survey cycle created successfully");
            queryClient.invalidateQueries({ queryKey: ["surveyPeriods"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to create survey period");
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }) => updatePeriodStatusRequest(id, status),
        onSuccess: () => {
            toast.success("Period status updated");
            queryClient.invalidateQueries({ queryKey: ["surveyPeriods"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update period status");
        },
    });

    return {
        activePeriod: activePeriodQuery.data,
        periods: allPeriodsQuery.data || [],
        isLoading: activePeriodQuery.isLoading || allPeriodsQuery.isLoading,
        createPeriod: createPeriodMutation.mutateAsync,
        updateStatus: updateStatusMutation.mutateAsync,
    };
};
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getUsersRequest,
    createUserRequest,
    updateUserRequest,
    deleteUserRequest,
} from "@/services/api/users.api.js";
import { subscribeToRealtimeEvent, getSocket } from "@/services/socket.js";
import { useAuth } from "@/hooks/useAuth.js";
import toast from "react-hot-toast";

/**
 * Fetch users with optional filters + pagination.
 *
 * Returns:
 *   users    → array for the current page
 *   meta     → { page, limit, total, totalPages }
 *   ...mutation helpers
 */
export const useUsers = (filters = {}) => {
    const queryClient = useQueryClient();
    const { isManager, isAdmin } = useAuth();

    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const limit = Number(filters.limit) > 0 ? Number(filters.limit) : 20;

    const queryKey = ["users", { ...filters, page, limit }];

    // 1. REST API load
    const usersQuery = useQuery({
        queryKey,
        queryFn: async () => {
            const response = await getUsersRequest({ ...filters, page, limit });
            // Backend returns { status, results, data: { users }, meta }
            const users = response?.data?.users || [];
            const meta =
                response?.meta || {
                    page,
                    limit,
                    total: users.length,
                    totalPages: 1,
                };
            return { users, meta };
        },
        staleTime: 60 * 1000,
        placeholderData: (prev) => prev,
    });

    // 2. Real-time WebSocket subscription — updates any cached users page
    useEffect(() => {
        if (!isAdmin && !isManager) return;

        const unsubscribeGps = subscribeToRealtimeEvent(
            "user:gps-permission-updated",
            (payload) => {
                // Invalidate every cached users page so realtime updates
                // refresh whichever page is currently shown.
                queryClient.invalidateQueries({ queryKey: ["users"] });
            },
        );

        const socket = getSocket();
        const handleReconnect = () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        };

        if (socket) socket.on("connect", handleReconnect);

        return () => {
            unsubscribeGps();
            if (socket) socket.off("connect", handleReconnect);
        };
    }, [isAdmin, isManager, queryClient]);

    const createUserMutation = useMutation({
        mutationFn: createUserRequest,
        onSuccess: () => {
            toast.success("User registered successfully");
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || err.message || "Failed to create user");
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: updateUserRequest,
        onSuccess: () => {
            toast.success("User updated successfully");
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || err.message || "Failed to update user");
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: deleteUserRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || err.message || "Failed to delete user");
        },
    });

    const users = usersQuery.data?.users || [];
    const meta = usersQuery.data?.meta || { page: 1, limit, total: 0, totalPages: 1 };

    return {
        users,
        meta,
        isFetching: usersQuery.isFetching,
        isLoading: usersQuery.isLoading,
        createUser: createUserMutation.mutateAsync,
        updateUser: updateUserMutation.mutateAsync,
        deleteUser: deleteUserMutation.mutateAsync,
    };
};
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

export const useUsers = () => {
    const queryClient = useQueryClient();
    const { isManager, isAdmin } = useAuth();

    // 1. Initial REST API Load: Database remains source of truth
    const usersQuery = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            const response = await getUsersRequest();
            return response?.data?.users || [];
        },
        staleTime: 60 * 1000,
    });

    // 2. Real-Time WebSocket Subscription for Live GPS & User Updates
    useEffect(() => {
        if (!isAdmin && !isManager) return;

        // Listen for live auditor GPS permission changes
        const unsubscribeGps = subscribeToRealtimeEvent("user:gps-permission-updated", (payload) => {
            console.log("⚡ [Realtime Event] user:gps-permission-updated:", payload);

            queryClient.setQueryData(["users"], (oldUsers) => {
                if (!Array.isArray(oldUsers)) return oldUsers;

                return oldUsers.map((u) => {
                    if (u.id === payload.userId) {
                        return {
                            ...u,
                            locationPermission: payload.gpsPermissionStatus || payload.locationPermission,
                            gpsPermissionStatus: payload.gpsPermissionStatus || payload.locationPermission,
                            updatedAt: payload.updatedAt || u.updatedAt,
                        };
                    }
                    return u;
                });
            });
        });

        // On socket reconnect, resynchronize with fresh DB state
        const socket = getSocket();
        const handleReconnect = () => {
            console.log("🔄 [Realtime] Socket reconnected, resynchronizing users...");
            queryClient.invalidateQueries({ queryKey: ["users"] });
        };

        if (socket) {
            socket.on("connect", handleReconnect);
        }

        return () => {
            unsubscribeGps();
            if (socket) {
                socket.off("connect", handleReconnect);
            }
        };
    }, [isAdmin, isManager, queryClient]);

    // Mutations
    const createUserMutation = useMutation({
        mutationFn: createUserRequest,
        onSuccess: () => {
            toast.success("User registered successfully");
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to create user");
        },
    });

    const updateUserMutation = useMutation({
        mutationFn: updateUserRequest,
        onSuccess: () => {
            toast.success("User updated successfully");
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update user");
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: deleteUserRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to delete user");
        },
    });

    return {
        users: usersQuery.data || [],
        isLoading: usersQuery.isLoading,
        createUser: createUserMutation.mutateAsync,
        updateUser: updateUserMutation.mutateAsync,
        deleteUser: deleteUserMutation.mutateAsync,
    };
};
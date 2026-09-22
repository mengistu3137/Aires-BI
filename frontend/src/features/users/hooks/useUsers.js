import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsersRequest, createUserRequest, updateUserRequest } from "@/services/api/users.api.js";
import { PILOT_USERS } from "@/data/pilotData.js";
import toast from "react-hot-toast";

export const useUsers = () => {
    const queryClient = useQueryClient();

    const usersQuery = useQuery({
        queryKey: ["users"],
        queryFn: async () => {
            try {
                const response = await getUsersRequest();
                return response?.data?.users || PILOT_USERS;
            } catch (err) {
                console.warn("Backend user API unreachable, falling back to pilot users:", err);
                return PILOT_USERS;
            }
        },
        staleTime: 60 * 1000,
    });

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

    return {
        users: usersQuery.data || [],
        isLoading: usersQuery.isLoading,
        createUser: createUserMutation.mutateAsync,
        updateUser: updateUserMutation.mutateAsync,
    };
};
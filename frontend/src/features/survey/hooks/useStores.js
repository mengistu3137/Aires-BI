import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getStoresRequest,
    createStoreRequest,
    updateStoreRequest,
    deleteStoreRequest,
} from "@/services/api/store.api.js";
import toast from "react-hot-toast";

export const useStores = (params = {}) => {
    const queryClient = useQueryClient();

    const storesQuery = useQuery({
        queryKey: ["stores", params],
        queryFn: async () => {
            const res = await getStoresRequest(params);
            // Backend returns: { status: "success", data: { stores: [...] } }
            return res?.data?.stores || res?.stores || [];
        },
        staleTime: 60 * 1000,
    });

    const createStoreMutation = useMutation({
        mutationFn: createStoreRequest,
        onSuccess: () => {
            toast.success("Physical store registered with GPS coordinates");
            queryClient.invalidateQueries({ queryKey: ["stores"] });
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || err?.message || "Failed to register store");
        },
    });

    const updateStoreMutation = useMutation({
        mutationFn: ({ id, payload }) => updateStoreRequest(id, payload),
        onSuccess: () => {
            toast.success("Store details updated");
            queryClient.invalidateQueries({ queryKey: ["stores"] });
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || err?.message || "Failed to update store");
        },
    });

    const deleteStoreMutation = useMutation({
        mutationFn: (id) => deleteStoreRequest(id),
        onSuccess: (res) => {
            if (res?.deactivated) {
                toast(res.message, { icon: "ℹ️", duration: 5000 });
            } else {
                toast.success(res?.message || "Store removed successfully");
            }
            queryClient.invalidateQueries({ queryKey: ["stores"] });
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || err?.message || "Failed to delete store");
        },
    });

    return {
        stores: storesQuery.data || [],
        isLoading: storesQuery.isLoading,
        isError: storesQuery.isError,
        createStore: createStoreMutation.mutateAsync,
        updateStore: updateStoreMutation.mutateAsync,
        deleteStore: deleteStoreMutation.mutateAsync,
        isDeleting: deleteStoreMutation.isPending,
    };
};
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStoresRequest, createStoreRequest, updateStoreRequest } from "@/services/api/store.api.js";
import { PILOT_STORES } from "@/data/pilotData.js";
import toast from "react-hot-toast";

export const useStores = (params = {}) => {
    const queryClient = useQueryClient();

    const storesQuery = useQuery({
        queryKey: ["stores", params],
        queryFn: async () => {
            try {
                const res = await getStoresRequest(params);
                return res?.data?.stores || PILOT_STORES;
            } catch (err) {
                console.warn("API stores endpoint unreachable, fallback to pilot stores:", err.message);
                return PILOT_STORES;
            }
        },
        staleTime: 5 * 60 * 1000,
    });

    const createStoreMutation = useMutation({
        mutationFn: createStoreRequest,
        onSuccess: () => {
            toast.success("Physical store registered with GPS coordinates");
            queryClient.invalidateQueries({ queryKey: ["stores"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to register store");
        },
    });

    const updateStoreMutation = useMutation({
        mutationFn: ({ id, payload }) => updateStoreRequest(id, payload),
        onSuccess: () => {
            toast.success("Store details updated");
            queryClient.invalidateQueries({ queryKey: ["stores"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update store");
        },
    });

    return {
        stores: storesQuery.data || [],
        isLoading: storesQuery.isLoading,
        createStore: createStoreMutation.mutateAsync,
        updateStore: updateStoreMutation.mutateAsync,
    };
};
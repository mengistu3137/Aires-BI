import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";
import toast from "react-hot-toast";

export const useProducts = (params = {}) => {
    const queryClient = useQueryClient();

    const productsQuery = useQuery({
        queryKey: ["products", params],
        queryFn: async () => {
            const res = await apiClient.get("/products", { params });
            return res.data?.data?.products || [];
        },
        staleTime: 60 * 1000,
    });

    const addPriceMutation = useMutation({
        mutationFn: async ({ productId, price, effectiveFrom, notes }) => {
            const res = await apiClient.post(`/products/${productId}/prices`, {
                price,
                effectiveFrom: effectiveFrom || new Date().toISOString(),
                notes,
            });
            return res.data;
        },
        onSuccess: () => {
            toast.success("Queens benchmark price updated successfully");
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to update benchmark price");
        },
    });

    return {
        products: productsQuery.data || [],
        isLoading: productsQuery.isLoading,
        addPrice: addPriceMutation.mutateAsync,
        isUpdatingPrice: addPriceMutation.isPending,
    };
};
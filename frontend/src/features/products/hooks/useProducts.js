// frontend/src/features/products/hooks/useProducts.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";
import {
    bulkCreateProductsRequest,
    createProductRequest,
    updateProductRequest,
    deleteProductRequest,
} from "@/services/api/product.api.js";
import toast from "react-hot-toast";

const getErrMessage = (err, fallback) =>
    err?.response?.data?.errors?.[0]?.message ||
    err?.response?.data?.message ||
    err?.message ||
    fallback;

export const isLinkedHistoryError = (err) => {
    const status = err?.response?.status;
    const message = err?.response?.data?.message || err?.message || "";
    return status === 409 && /linked history/i.test(message);
};

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
        onError: (err) => toast.error(getErrMessage(err, "Failed to update benchmark price")),
    });

    // Bulk import runs in chunks; the page shows one summary, so no per-chunk toast.
    const bulkImportMutation = useMutation({
        mutationFn: (items) => bulkCreateProductsRequest(items),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (err) => toast.error(getErrMessage(err, "Failed to import items")),
    });

    const createMutation = useMutation({
        mutationFn: (payload) => createProductRequest(payload),
        onSuccess: () => {
            toast.success("Product created");
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (err) => toast.error(getErrMessage(err, "Failed to create product")),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => updateProductRequest(id, data),
        onSuccess: () => {
            toast.success("Product updated");
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (err) => toast.error(getErrMessage(err, "Failed to update product")),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => deleteProductRequest(id),
        onSuccess: () => {
            toast.success("Product deleted");
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (err) => toast.error(getErrMessage(err, "Failed to delete product")),
    });

    return {
        products: productsQuery.data || [],
        isLoading: productsQuery.isLoading,

        addPrice: addPriceMutation.mutateAsync,
        isUpdatingPrice: addPriceMutation.isPending,

        bulkImport: bulkImportMutation.mutateAsync,
        isImporting: bulkImportMutation.isPending,

        createProduct: createMutation.mutateAsync,
        isCreating: createMutation.isPending,

        updateProduct: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,

        deleteProduct: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
    };
};
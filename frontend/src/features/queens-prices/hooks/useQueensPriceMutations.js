import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createQueensPriceRequest,
  updateQueensPriceRequest,
  deleteQueensPriceRequest,
} from "@/services/api/queens-prices.api.js";

/**
 * Invalidate all Queens price related queries for a product
 */
const invalidateQueensPriceQueries = (queryClient, { id, productId } = {}) => {
  queryClient.invalidateQueries({ queryKey: ["queens-prices", "list"] });
  if (id) {
    queryClient.invalidateQueries({
      queryKey: ["queens-prices", "detail", id],
    });
  }
  if (productId) {
    queryClient.invalidateQueries({
      queryKey: ["queens-prices", "history", productId],
    });
    queryClient.invalidateQueries({
      queryKey: ["queens-prices", "current", productId],
    });
  }
};

/**
 * Create a new Queens price
 */
export const useCreateQueensPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQueensPriceRequest,
    onSuccess: (data) => {
      toast.success("Queens price created");
      invalidateQueensPriceQueries(queryClient, {
        id: data?.data?.id,
        productId: data?.data?.productId,
      });
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Update an existing Queens price
 */
export const useUpdateQueensPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateQueensPriceRequest,
    onSuccess: (data) => {
      toast.success("Queens price updated");
      invalidateQueensPriceQueries(queryClient, {
        id: data?.data?.id,
        productId: data?.data?.productId,
      });
    },
    meta: { skipGlobalToast: true },
  });
};

/**
 * Delete a Queens price (scheduled only, ADMIN)
 */
export const useDeleteQueensPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteQueensPriceRequest,
    onSuccess: (_data, id) => {
      toast.success("Queens price deleted");
      invalidateQueensPriceQueries(queryClient, { id });
    },
  });
};

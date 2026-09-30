import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createQueensPriceRequest,
  updateQueensPriceRequest,
  deleteQueensPriceRequest,
} from "@/services/api/queens-prices.api.js";

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

export const useCreateQueensPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQueensPriceRequest,
    onSuccess: (data, variables) => {
      // Suppress generic toast if caller requested custom toast
      if (!variables?.skipToast) {
        toast.success("Queens price created", {
          id: "queens-price-toast",
          duration: 1500,
        });
      }
      invalidateQueensPriceQueries(queryClient, {
        id: data?.data?.id,
        productId: data?.data?.productId,
      });
    },
    meta: { skipGlobalToast: true },
  });
};
export const useUpdateQueensPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateQueensPriceRequest,
    onSuccess: (data) => {
      toast.success("Queens price updated", {
        id: "queens-price-toast",
        duration: 1500,
      });
      invalidateQueensPriceQueries(queryClient, {
        id: data?.data?.id,
        productId: data?.data?.productId,
      });
    },
    meta: { skipGlobalToast: true },
  });
};

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
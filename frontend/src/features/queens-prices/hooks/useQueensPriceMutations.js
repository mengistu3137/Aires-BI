import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createQueensPriceRequest,
  updateQueensPriceRequest,
  deleteQueensPriceRequest,
} from "@/services/api/queens-prices.api.js";

/**
 * Invalidate Queens price and downstream Price Analysis & Dashboard queries
 */
const invalidateQueensPriceQueries = (queryClient, { id, productId } = {}) => {
  // 1. Queens Prices Cache
  queryClient.invalidateQueries({ queryKey: ["queens-prices"] });

  // 2. Price Analysis Cache (List, Detail, Readiness)
  queryClient.invalidateQueries({ queryKey: ["price-analysis"] });

  // 3. Operational Dashboard & Alerts
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["alerts"] });
  queryClient.invalidateQueries({ queryKey: ["products"] });
};

export const useCreateQueensPrice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createQueensPriceRequest,
    onSuccess: (data, variables) => {
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
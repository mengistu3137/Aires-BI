import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { listAuditsRequest, getAuditHistoryRequest } from "@/services/api/audit.api.js";

/**
 * Hook for listing audits with filters
 */
export const useAudits = (filters = {}) => {
  return useQuery({
    queryKey: ["audits", "list", filters],
    queryFn: () => listAuditsRequest(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => ({
      audits: data.data || [],
      meta: data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    }),
  });
};

/**
 * Hook for infinite scrolling audit list
 */
export const useInfiniteAudits = (filters = {}) => {
  return useInfiniteQuery({
    queryKey: ["audits", "infinite", filters],
    queryFn: ({ pageParam = 1 }) => listAuditsRequest({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.meta || {};
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * Hook for audit history (completed audits)
 */
export const useAuditHistory = (filters = {}) => {
  return useQuery({
    queryKey: ["audits", "history", filters],
    queryFn: () => getAuditHistoryRequest(filters),
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      audits: data.data || [],
      meta: data.meta || { page: 1, limit: 20, total: 0, totalPages: 1 },
    }),
  });
};

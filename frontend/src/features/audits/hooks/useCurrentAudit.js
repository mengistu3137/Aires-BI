import { useQuery } from "@tanstack/react-query";
import { getCurrentAuditRequest } from "@/services/api/audit.api.js";

/**
 * Hook for fetching the current active audit for the authenticated auditor
 */
export const useCurrentAudit = (options = {}) => {
  return useQuery({
    queryKey: ["audits", "current"],
    queryFn: getCurrentAuditRequest,
    staleTime: 30 * 1000,
    select: (data) => data.data,
    ...options,
  });
};

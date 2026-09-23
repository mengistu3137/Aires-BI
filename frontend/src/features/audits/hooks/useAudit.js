import { useQuery } from "@tanstack/react-query";
import { getAuditByIdRequest } from "@/services/api/audit.api.js";

/**
 * Hook for fetching a single audit by ID
 */
export const useAudit = (auditId, options = {}) => {
  return useQuery({
    queryKey: ["audits", "detail", auditId],
    queryFn: () => getAuditByIdRequest(auditId),
    enabled: Boolean(auditId),
    staleTime: 30 * 1000, // 30 seconds - audit data changes frequently
    select: (data) => data.data,
    ...options,
  });
};

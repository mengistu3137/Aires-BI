import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Global listener that invalidates observation-related queries
 * whenever the offline queue reports a change (sync success / failure).
 * Mount once at the app shell level.
 */
export const useObservationQueueInvalidator = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail || {};
      queryClient.invalidateQueries({ queryKey: ["observations", "list"] });
      if (detail.auditId) {
        queryClient.invalidateQueries({
          queryKey: ["observations", "audit", detail.auditId],
        });
        queryClient.invalidateQueries({
          queryKey: ["audits", "detail", detail.auditId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    window.addEventListener("aires:observations-changed", handler);
    return () => {
      window.removeEventListener("aires:observations-changed", handler);
    };
  }, [queryClient]);
};

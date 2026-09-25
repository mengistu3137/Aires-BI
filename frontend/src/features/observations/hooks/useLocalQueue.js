import { useEffect, useState, useCallback, useRef } from "react";
import { getObservationsForAudit, formatQueuedObservation } from "../offline/observationQueue.js";

/**
 * Reads the local IndexedDB queue for a given audit and keeps it fresh
 * whenever the queue emits a change event.
 *
 * Guards against out-of-order async reads: if a new refresh is issued
 * while a previous one is still in flight, the older result is discarded.
 * This prevents a stale PENDING row from overwriting the fresher state
 * after the queue has already been emptied.
 */
export const useLocalQueue = (auditId) => {
  const [localObservations, setLocalObservations] = useState([]);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!auditId) {
      setLocalObservations([]);
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      const records = await getObservationsForAudit(auditId);

      // Discard if a newer refresh has been issued while this was in flight
      if (requestId !== requestIdRef.current) return;

      const formatted = records.map(formatQueuedObservation).filter(Boolean);
      setLocalObservations(formatted);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.warn("[useLocalQueue] Failed to read queue:", err);
      setLocalObservations([]);
    }
  }, [auditId]);

  useEffect(() => {
    refresh();

    const handleChange = (event) => {
      const changedAuditId = event?.detail?.auditId;
      if (!changedAuditId || changedAuditId === auditId) {
        refresh();
      }
    };

    window.addEventListener("aires:observations-changed", handleChange);
    window.addEventListener("online", refresh);

    return () => {
      window.removeEventListener("aires:observations-changed", handleChange);
      window.removeEventListener("online", refresh);
    };
  }, [refresh, auditId]);

  return { localObservations, refreshLocalQueue: refresh };
};

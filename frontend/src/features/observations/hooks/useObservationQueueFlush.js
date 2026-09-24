import { useEffect } from "react";
import { flushQueue } from "../offline/observationQueue.js";

/**
 * Flush the observation queue whenever the browser comes back online.
 * Mount once at the app shell level.
 */
export const useObservationQueueFlush = () => {
  useEffect(() => {
    const tryFlush = () => {
      flushQueue().catch(() => {
        // Silent — retries happen on next online event
      });
    };

    if (navigator.onLine) tryFlush();

    window.addEventListener("online", tryFlush);
    return () => window.removeEventListener("online", tryFlush);
  }, []);
};

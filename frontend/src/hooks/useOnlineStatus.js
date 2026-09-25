import { useEffect, useState } from "react";

/**
 * Live browser connectivity state. Backed by the `online`/`offline` window
 * events (the same signal the offline queue itself reacts to), so any page
 * that needs to show a "you're offline" banner or gate an online-only
 * action can just read this instead of re-wiring its own listeners.
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};

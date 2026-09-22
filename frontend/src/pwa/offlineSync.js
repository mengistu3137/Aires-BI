import { useSurveyStore } from "@/stores/survey/survey.store.js";
import toast from "react-hot-toast";

let isListening = false;

/**
 * Initializes listeners for window 'online' events to automatically
 * flush the local offline submission queue when connectivity is restored.
 */
export const initOfflineAutoSync = () => {
    if (typeof window === "undefined" || isListening) return;

    const handleOnlineReconnection = async () => {
        const { offlineQueue, syncOfflineQueue, isSyncing } = useSurveyStore.getState();

        if (offlineQueue.length > 0 && !isSyncing) {
            toast("Connection restored. Syncing offline survey queue...", {
                icon: "🔄",
                id: "auto-sync-start",
            });

            try {
                const result = await syncOfflineQueue();
                toast.success(`Auto-synced ${result.syncedCount} field surveys to Aires-BI!`, {
                    id: "auto-sync-success",
                });
            } catch (err) {
                toast.error("Auto-sync failed. Surveys remain securely in local queue.", {
                    id: "auto-sync-error",
                });
            }
        }
    };

    window.addEventListener("online", handleOnlineReconnection);
    isListening = true;
};
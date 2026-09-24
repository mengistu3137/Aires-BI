import { create } from "zustand";
import { persist } from "zustand/middleware";
import { submitSurveyEntryRequest, syncBatchEntriesRequest } from "@/services/api/survey.api.js";

export const useSurveyStore = create(
    persist(
        (set, get) => ({
            // Real data only: initialized as empty arrays (NO mock data)
            assignments: [],
            surveyEntries: [],
            products: [],
            competitors: [],
            offlineQueue: [],
            isSyncing: false,

            setAssignments: (assignments) => set({ assignments }),
            setProducts: (products) => set({ products }),
            setCompetitors: (competitors) => set({ competitors }),

            /**
             * Submits a survey entry:
             * Tries backend API first; if offline or network fails, saves to local offlineQueue.
             */
            submitEntry: async (entryData) => {
                const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

                if (isOnline) {
                    try {
                        const res = await submitSurveyEntryRequest(entryData);
                        const savedEntry = res?.data?.entry || {
                            ...entryData,
                            id: `SUR-${Date.now()}`,
                            syncStatus: "SYNCED",
                        };

                        set((state) => ({
                            surveyEntries: [savedEntry, ...state.surveyEntries],
                        }));

                        return { success: true, entry: savedEntry, offline: false };
                    } catch (err) {
                        console.warn("Direct submission to API failed, queuing locally:", err.message);
                    }
                }

                // Offline Fallback Queue
                const offlineEntry = {
                    ...entryData,
                    id: `OFFLINE-${Date.now()}`,
                    syncStatus: "PENDING",
                    timestamp: new Date().toISOString(),
                };

                set((state) => ({
                    offlineQueue: [...state.offlineQueue, offlineEntry],
                    surveyEntries: [offlineEntry, ...state.surveyEntries],
                }));

                return { success: true, entry: offlineEntry, offline: true };
            },

            /**
             * Flushes all pending offline entries to the backend API
             */
            syncOfflineQueue: async () => {
                const { offlineQueue } = get();
                if (!offlineQueue.length) return { syncedCount: 0 };

                set({ isSyncing: true });
                try {
                    const res = await syncBatchEntriesRequest(offlineQueue);
                    const syncedCount = res?.data?.syncedCount || offlineQueue.length;

                    set((state) => ({
                        offlineQueue: [],
                        surveyEntries: state.surveyEntries.map((e) =>
                            e.syncStatus === "PENDING" ? { ...e, syncStatus: "SYNCED" } : e
                        ),
                    }));

                    return { success: true, syncedCount };
                } catch (error) {
                    console.error("Batch offline sync failed:", error);
                    throw error;
                } finally {
                    set({ isSyncing: false });
                }
            },
        }),
        {
            name: "aires-bi-survey-store",
            partialize: (state) => ({
                offlineQueue: state.offlineQueue,
                surveyEntries: state.surveyEntries,
            }),
        }
    )
);
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PILOT_ASSIGNMENTS, PILOT_ENTRIES, PILOT_PRODUCTS, PILOT_COMPETITORS } from "@/data/pilotData.js";
import { submitSurveyEntryRequest, syncBatchEntriesRequest } from "@/services/api/survey.api.js";

export const useSurveyStore = create(
    persist(
        (set, get) => ({
            assignments: PILOT_ASSIGNMENTS,
            surveyEntries: PILOT_ENTRIES,
            products: PILOT_PRODUCTS,
            competitors: PILOT_COMPETITORS,
            offlineQueue: [],
            isSyncing: false,

            setAssignments: (assignments) => set({ assignments }),
            setProducts: (products) => set({ products }),
            setCompetitors: (competitors) => set({ competitors }),

            /**
             * Submits a survey entry:
             * Tries API first; if offline or fails, saves to local offlineQueue.
             */
            submitEntry: async (entryData) => {
                const isOnline = navigator.onLine;

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
                        console.warn("Direct submission failed, adding to offline queue:", err);
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

                    // Mark entries in surveyEntries as SYNCED
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
                assignments: state.assignments,
            }),
        }
    )
);
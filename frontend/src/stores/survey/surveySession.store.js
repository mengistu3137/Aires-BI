import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useSurveySessionStore = create(
    persist(
        (set, get) => ({
            activeAssignment: null,
            activeAudit: null,

            /**
             * Locks the selected assignment into the active field session.
             * All downstream price collections automatically inherit store,
             * competitor, surveyPeriod, and assigned products from this record.
             */
            setActiveAssignment: (assignment) => {
                set({ activeAssignment: assignment });
            },

            clearActiveAssignment: () => {
                set({ activeAssignment: null, activeAudit: null });
            },

            setActiveAudit: (audit) => {
                set({ activeAudit: audit });
            },

            /**
             * Derives contextual properties directly from the locked assignment
             */
            getSessionContext: () => {
                const { activeAssignment } = get();
                if (!activeAssignment) return null;

                return {
                    assignmentId: activeAssignment.id,
                    storeId: activeAssignment.store?.id,
                    storeName: activeAssignment.store?.name,
                    storeType: activeAssignment.store?.type,
                    storeArea: activeAssignment.store?.area,
                    storeAddress: activeAssignment.store?.address,
                    storeLatitude: activeAssignment.store?.latitude,
                    storeLongitude: activeAssignment.store?.longitude,
                    competitorId: activeAssignment.store?.competitor?.id,
                    competitorName: activeAssignment.store?.competitor?.name,
                    surveyPeriodId: activeAssignment.surveyPeriod?.id,
                    surveyPeriodName: activeAssignment.surveyPeriod?.name,
                    assignedProducts: activeAssignment.items || [],
                };
            },
        }),
        {
            name: "aires-survey-session",
            partialize: (state) => ({
                activeAssignment: state.activeAssignment,
                activeAudit: state.activeAudit,
            }),
        }
    )
);
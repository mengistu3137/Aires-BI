import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const defaultSettings = {
  kitchenFlowEnabled: true,
  paymentsEnabled: true,
  reportsEnabled: true,
  defaultTimezone: 'Africa/Addis_Ababa',
  defaultCurrency: 'ETB',
  defaultLanguage: 'en',
  maxOrganizations: 500,
  maxUsersPerOrganization: 200,
}

export const useSuperAdminStore = create(
  persist(
    (set) => ({
      organizationSearch: '',
      selectedOrganizationId: 'ALL',
      settings: defaultSettings,
      setOrganizationSearch: (organizationSearch) => set({ organizationSearch }),
      setSelectedOrganizationId: (selectedOrganizationId) => set({ selectedOrganizationId }),
      resetFilters: () => set({ organizationSearch: '' }),
      setSetting: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        })),
      resetSettings: () =>
        set({
          settings: defaultSettings,
        }),
    }),
    {
      name: 'milki-super-admin',
      partialize: (state) => ({
        settings: state.settings,
        selectedOrganizationId: state.selectedOrganizationId,
      }),
    },
  ),
)

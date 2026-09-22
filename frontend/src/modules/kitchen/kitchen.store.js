import { create } from 'zustand'

export const useKitchenStore = create((set) => ({
  activeTab: 'NEW',
  setActiveTab: (activeTab) => set({ activeTab }),
}))

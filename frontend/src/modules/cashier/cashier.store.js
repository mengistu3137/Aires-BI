import { create } from 'zustand'

export const useCashierStore = create((set) => ({
  methodFilter: 'ALL',
  period: 'TODAY',
  setMethodFilter: (methodFilter) => set({ methodFilter }),
  setPeriod: (period) => set({ period }),
}))

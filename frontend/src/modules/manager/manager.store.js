import { create } from 'zustand'

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function weekRange() {
  const now = new Date()
  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day

  const start = new Date(now)
  start.setDate(now.getDate() + mondayOffset)

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  }
}

export const useManagerStore = create((set) => ({
  period: 'TODAY',
  dateRange: {
    startDate: todayDate(),
    endDate: todayDate(),
  },
  setPeriod: (period) =>
    set((state) => {
      if (period === 'TODAY') {
        const today = todayDate()
        return {
          ...state,
          period,
          dateRange: {
            startDate: today,
            endDate: today,
          },
        }
      }

      if (period === 'WEEK') {
        return {
          ...state,
          period,
          dateRange: weekRange(),
        }
      }

      return {
        ...state,
        period,
      }
    }),
  setDateRange: (dateRange) =>
    set((state) => ({
      dateRange: {
        ...state.dateRange,
        ...dateRange,
      },
      period: 'CUSTOM',
    })),
}))

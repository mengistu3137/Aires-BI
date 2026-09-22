import { create } from 'zustand'
import { userService } from './user.service'

function buildUserQuery(filters) {
  return {
    ...(filters.role !== 'ALL' ? { role: filters.role } : {}),
    ...(filters.status !== 'ALL' ? { isActive: filters.status === 'ACTIVE' } : {}),
    page: 1,
    limit: 100,
  }
}

export const useUserStore = create((set, get) => ({
  users: [],
  branches: [],
  loading: false,
  filters: {
    search: '',
    role: 'ALL',
    status: 'ALL',
  },
  selectedUser: null,

  setFilters: (nextFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...nextFilters },
    })),

  setSelectedUser: (selectedUser) => set({ selectedUser }),

  fetchUsers: async () => {
    const { filters } = get()
    set({ loading: true })

    try {
      const users = await userService.listUsers(buildUserQuery(filters))
      set({ users: users || [] })
    } finally {
      set({ loading: false })
    }
  },

  fetchBranches: async () => {
    const branches = await userService.listBranches()
    set({ branches: branches || [] })
  },

  createUser: async (payload) => {
    const createdUser = await userService.createUser(payload)
    await get().fetchUsers()
    return createdUser
  },

  updateUser: async (userId, payload) => {
    const updatedUser = await userService.updateUser(userId, payload)
    await get().fetchUsers()
    return updatedUser
  },

  toggleUserStatus: async (userId, isActive) => {
    const updatedUser = await userService.updateUserStatus(userId, isActive)
    await get().fetchUsers()
    return updatedUser
  },

  deleteUser: async (userId) => {
    await userService.deleteUser(userId)
    await get().fetchUsers()
  },
}))

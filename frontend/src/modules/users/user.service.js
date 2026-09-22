import { api } from '../../lib/axios'

export const userService = {
  async listUsers(params) {
    const { data } = await api.get('/users', { params })
    return data?.data || data
  },

  async createUser(payload) {
    const { data } = await api.post('/users', payload)
    return data?.data || data
  },

  async updateUser(userId, payload) {
    const { data } = await api.patch(`/users/${userId}`, payload)
    return data?.data || data
  },

  async updateUserStatus(userId, isActive) {
    const { data } = await api.patch(`/users/${userId}/status`, { isActive })
    return data?.data || data
  },

  async deleteUser(userId) {
    const { data } = await api.delete(`/users/${userId}`)
    return data?.data || data
  },

  async listBranches() {
    const { data } = await api.get('/branches', { params: { isActive: true } })
    return data?.data?.branches || []
  },
}

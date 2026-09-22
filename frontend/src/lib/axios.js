import axios from 'axios'
import { toast } from 'sonner'
import { useSuperAdminStore } from '../modules/superadmin/super-admin.store'
import { useAuthStore } from '../store/auth-store'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
})

api.interceptors.request.use((config) => {
  const { token, role } = useAuthStore.getState()
  const { selectedOrganizationId } = useSuperAdminStore.getState()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (role === 'SUPER_ADMIN' && selectedOrganizationId && selectedOrganizationId !== 'ALL') {
    config.headers['x-organization-context-id'] = selectedOrganizationId
  } else {
    delete config.headers['x-organization-context-id']
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Unexpected error'

    if (status === 401) {
      useAuthStore.getState().clearSession()
      toast.error('Session expired. Please log in again.')
    }

    const wrappedError = new Error(message)
    wrappedError.status = status

    return Promise.reject(wrappedError)
  },
)

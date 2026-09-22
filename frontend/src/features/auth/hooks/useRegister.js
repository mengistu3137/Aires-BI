import { useMutation } from '@tanstack/react-query'
import { registerOrgRequest } from '@/services/api/auth.api.js'
import { useAuthStore } from '@/stores/auth/auth.store.js'
import { ApiError } from '@/services/apiError.js'

export const useRegister = () => {
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: registerOrgRequest,
    onSuccess: (response) => {
      const { data } = response
      // Capture credentials and establish immediate active session [1]
      setAuth(data.user, data.token, ['*'], false)
    },
    onError: (err) => {
      throw ApiError.fromAxios(err)
    },
  })
}

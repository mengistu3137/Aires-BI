import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createUserRequest } from '@/services/api/user.api.js'
import { useTenant } from '@/hooks/useTenant.js'

/**
 * Custom mutation hook to handle creating a new user.
 * Automatically triggers cache invalidation to refresh active user directories.
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient()
  const { organizationId } = useTenant()

  return useMutation({
    mutationFn: createUserRequest,
    onSuccess: () => {
      // Invalidate all active user list caches starting with the current organization ID [5]
      queryClient.invalidateQueries({
        queryKey: ['users', organizationId],
      })
    },
  })
}
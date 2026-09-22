import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteUserRequest } from '@/services/api/user.api.js'
import { useTenant } from '@/hooks/useTenant.js'

/**
 * Custom mutation hook to administratively soft-delete a user.
 * Cleans up and purges deleted records completely from the client-side cache.
 */
export const useDeleteUser = () => {
    const queryClient = useQueryClient()
    const { organizationId } = useTenant()

    return useMutation({
        mutationFn: deleteUserRequest,
        onSuccess: (response, userId) => {
            // 1. Invalidate all user list directories to remove the user reactively [5]
            queryClient.invalidateQueries({
                queryKey: ['users', organizationId],
            })

            // 2. Evict the user's detailed cache to prevent rendering stale deleted profiles
            queryClient.removeQueries({
                queryKey: ['user', organizationId, userId],
            })
        },
    })
}
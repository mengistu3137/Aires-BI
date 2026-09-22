import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleUserStatusRequest } from '@/services/api/user.api.js'
import { useTenant } from '@/hooks/useTenant.js'

/**
 * Custom mutation hook to toggle a user's active/inactive status.
 * Automatically clears associated directory caches upon success.
 */
export const useToggleUserStatus = () => {
    const queryClient = useQueryClient()
    const { organizationId } = useTenant()

    return useMutation({
        // Expects custom structured payload: mutate({ userId: 'id', isActive: true/false })
        mutationFn: ({ userId, isActive }) => toggleUserStatusRequest(userId, { isActive }),

        onSuccess: (response, variables) => {
            // 1. Invalidate all user directories to refresh status badges
            queryClient.invalidateQueries({
                queryKey: ['users', organizationId],
            })

            // 2. Invalidate the detailed cache specifically for this target user [5]
            queryClient.invalidateQueries({
                queryKey: ['user', organizationId, variables.userId],
            })
        },
    })
}
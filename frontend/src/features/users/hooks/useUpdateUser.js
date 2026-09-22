import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateUserRequest } from '@/services/api/user.api.js'
import { useTenant } from '@/hooks/useTenant.js'

/**
 * Custom mutation hook to update an existing user's record details.
 * Supports optimistic locking by incorporating the 'version' property.
 */
export const useUpdateUser = () => {
    const queryClient = useQueryClient()
    const { organizationId } = useTenant()

    return useMutation({
        // Expects custom structured payload: mutate({ userId: 'id', userData: { ... } })
        mutationFn: ({ userId, userData }) => updateUserRequest(userId, userData),

        onSuccess: (response, variables) => {
            // 1. Invalidate all user listing directories starting with the active organization
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
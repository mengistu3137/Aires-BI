import { useQuery } from '@tanstack/react-query'
import { getUserByIdRequest } from '@/services/api/user.api.js'
import { useTenant } from '@/hooks/useTenant.js'

/**
 * Custom hook to retrieve a single user's detailed profile record by ID.
 * 
 * @param {string} userId - The unique identifier of the target user.
 */
export const useUser = (userId) => {
    const { organizationId } = useTenant()

    return useQuery({
        // Scope the cache key by both organization and userId to prevent cross-tenant cache bleeding
        queryKey: ['user', organizationId, userId],

        queryFn: () => getUserByIdRequest(userId),

        // Only execute the network request if both parameters are successfully resolved
        enabled: Boolean(userId) && Boolean(organizationId),
    })
}
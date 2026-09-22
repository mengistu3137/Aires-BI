import { useMutation } from '@tanstack/react-query'
import { resetUserPasswordRequest } from '@/services/api/user.api.js'

/**
 * Custom mutation hook to administratively reset a user's password.
 * Does not require cache invalidation as password hashes are not stored in read caches.
 */
export const useResetUserPassword = () => {
    return useMutation({
        // Expects custom structured payload: mutate({ userId: 'id', password: 'newSecurePassword' })
        mutationFn: ({ userId, password }) => resetUserPasswordRequest(userId, { password }),
    })
}
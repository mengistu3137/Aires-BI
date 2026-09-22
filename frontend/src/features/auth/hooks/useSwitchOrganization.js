import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { selectOrganizationRequest } from '@/services/api/auth.api.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useTenant } from '@/hooks/useTenant.js'
import { useBranch } from '@/hooks/useBranch.js'
import { useAccessStore } from '@/stores/permissions/access.store.js'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export const useSwitchOrganization = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { login: setAuth } = useAuth()
  const { setOrganization } = useTenant()
  const { setBranch, resetBranch } = useBranch()

  const setPermissions = useAccessStore((state) => state.setPermissions)
  const setFeatures = useAccessStore((state) => state.setFeatures)

  return useMutation({
    // Use email instead of userId
    mutationFn: ({ email, organizationId }) =>
      selectOrganizationRequest({
        email,
        organizationId,
      }),

    onSuccess: (response) => {
      // ✅ Same envelope as useSelectOrganization: unwrap response.data.data
      const payload = response?.data?.data

      if (!payload) {
        toast.error('Invalid organization switch response')
        return
      }

      const { user, token, organization, branch, permissions, features } = payload

      setAuth({
        user,
        token,
      })

      if (organization) {
        setOrganization(organization)
      }

      if (branch) {
        setBranch(branch)
      } else {
        resetBranch()
      }

      const normalizedPermissions = Array.isArray(permissions)
        ? permissions
            .map((permission) =>
              typeof permission === 'string'
                ? permission
                : permission?.code || permission?.name || '',
            )
            .filter(Boolean)
        : []

      setPermissions(normalizedPermissions)

      if (features) {
        setFeatures(features)
      }

      queryClient.clear()

      toast.success(`Switched to ${organization?.name || 'new organization'}`)

      navigate('/dashboard', { replace: true })
    },

    onError: (error) => {
      console.error('Organization switch error:', error)
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to switch organization',
      )
    },
  })
}

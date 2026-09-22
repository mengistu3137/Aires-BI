import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { selectOrganizationRequest } from '@/services/api/auth.api.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useTenant } from '@/hooks/useTenant.js'
import { useBranch } from '@/hooks/useBranch.js'
import { useAccessStore } from '@/stores/permissions/access.store.js'
import { useTenantStore } from '@/stores/tenant/tenant.store.js'
import toast from 'react-hot-toast'

export const useSelectOrganization = () => {
  const navigate = useNavigate()

  const { login: setAuth } = useAuth()

  const { setOrganization } = useTenant()
  const { setBranch } = useBranch()

  const setPermissions = useAccessStore((state) => state.setPermissions)
  const setFeatures = useAccessStore((state) => state.setFeatures)

  const setAvailableOrganizations = useTenantStore((state) => state.setAvailableOrganizations)

  return useMutation({
    mutationFn: ({ email, organizationId }) =>
      selectOrganizationRequest({
        email,
        organizationId,
      }),

    onSuccess: (response) => {
      // ✅ The API envelope is { status, message, data: {...} } and
      // `response` here is the full axios response, so the actual
      // payload is nested at response.data.data, NOT response.data.
      const payload = response?.data?.data

      if (!payload) {
        toast.error('Invalid organization selection response')
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

      // Store the selected organization in available list
      if (organization) {
        setAvailableOrganizations([
          organization,
          ...(
            JSON.parse(localStorage.getItem('milkiflow-tenant') || '{}')?.state
              ?.availableOrganizations || []
          ).filter((org) => org.id !== organization.id),
        ])
      }

      toast.success('Organization selected successfully')

      navigate('/dashboard', {
        replace: true,
      })
    },

    onError: (error) => {
      console.error('Organization selection error:', error)

      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to select organization',
      )
    },
  })
}

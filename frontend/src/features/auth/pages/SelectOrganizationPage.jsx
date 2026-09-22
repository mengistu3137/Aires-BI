import React, { useState } from 'react'
import { useSelectOrganization } from '../hooks/useSelectOrganization.js'
import { useAuth } from '@/hooks/useAuth.js'
import { useTenant } from '@/hooks/useTenant.js'
import { Card } from '@/components/ui/Card.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { LoadingState } from '@/components/feedback/LoadingState.jsx'
import { ErrorState } from '@/components/feedback/ErrorState.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { cn } from '@/utils/cn.js'

export const SelectOrganizationPage = () => {
  const { tempUserId, tempEmail, availableOrganizations } = useAuth()
  const { availableOrganizations: tenantOrganizations } = useTenant()
  const { mutate: selectOrg, isPending: isSelecting, isError, error } = useSelectOrganization()

  const [selectedOrgId, setSelectedOrgId] = useState(null)

  // Use email from temp context or from user
  const email = tempEmail

  const organizations =
    availableOrganizations?.length > 0 ? availableOrganizations : tenantOrganizations || []

  const handleContinue = () => {
    if (selectedOrgId && email) {
      selectOrg({
        email,
        organizationId: selectedOrgId,
      })
    }
  }

  if (!email || !organizations?.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading your organizations..." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorState
          message={error?.message || 'Failed to load organizations'}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-secondary-200/30 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="font-extrabold text-2xl tracking-tight text-text-primary">
              Milki<span className="text-secondary-500">Flow</span>
            </span>
            <Badge value="MULTI-TENANT" variant="info" />
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Select Your Workspace
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            You have access to multiple organizations. Choose one to continue.
          </p>
        </div>

        <Card className="p-6 shadow-soft-xl">
          <div className="space-y-3">
            {organizations.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => setSelectedOrgId(org.id)}
                className={cn(
                  'w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer',
                  selectedOrgId === org.id
                    ? 'border-primary-500 bg-primary-50/50 shadow-glow'
                    : 'border-primary-100/60 hover:border-primary-300 hover:bg-primary-50/20',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-12 w-12 rounded-xl flex items-center justify-center font-extrabold text-lg shrink-0',
                        selectedOrgId === org.id
                          ? 'bg-primary-500 text-white'
                          : 'bg-primary-50 text-primary-600',
                      )}
                    >
                      {org.name?.charAt(0)?.toUpperCase() || 'O'}
                    </div>
                    <div>
                      <p className="font-bold text-text-primary">{org.name}</p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {org.businessType || 'Organization'}
                      </p>
                    </div>
                  </div>

                  {selectedOrgId === org.id && (
                    <span className="h-6 w-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <Button
              className="w-full py-3"
              disabled={!selectedOrgId || isSelecting}
              onClick={handleContinue}
            >
              {isSelecting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : (
                'Continue to Dashboard'
              )}
            </Button>

            <p className="text-center text-xs text-text-secondary">
              Need help? Contact your system administrator.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Logo from '../../../components/Logo'
import { Button } from '../../../components/ui/button'
import { Select } from '../../../components/ui/select'
import { superAdminService } from '../../../services/super-admin.service'
import { useAuthStore } from '../../../store/auth-store'
import { useUiStore } from '../../../store/ui-store'
import { useSuperAdminStore } from '../super-admin.store'

export function SuperAdminTopbar() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const organizationSearch = useSuperAdminStore((state) => state.organizationSearch)
  const setOrganizationSearch = useSuperAdminStore((state) => state.setOrganizationSearch)
  const selectedOrganizationId = useSuperAdminStore((state) => state.selectedOrganizationId)
  const setSelectedOrganizationId = useSuperAdminStore((state) => state.setSelectedOrganizationId)

  const organizationsQuery = useQuery({
    queryKey: ['super-admin-context-organizations'],
    queryFn: () => superAdminService.organizations({ page: 1, limit: 200 }),
    staleTime: 2 * 60 * 1000,
  })

  const organizationOptions = [{ label: 'Platform View (All Organizations)', value: 'ALL' }].concat(
    (organizationsQuery.data?.rows || []).map((organization) => ({
      label: organization.name,
      value: organization.id,
    })),
  )

  const onLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 lg:px-6">
      <div className="rounded-2xl bg-surface/80 px-4 py-4 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-100/70 text-text-secondary lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <Logo className="h-8 w-auto" />
              <div>
                <p className="text-xs uppercase tracking-wide text-text-secondary">
                  Platform Control
                </p>
                <p className="text-sm font-semibold text-text-primary">Super Admin Workspace</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-text-primary">{user?.name || 'Super Admin'}</p>
              <p className="text-xs uppercase text-text-secondary">SUPER_ADMIN</p>
            </div>
            <Button variant="ghost" className="gap-2" onClick={onLogout}>
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="relative block">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              className="h-11 w-full rounded-2xl border border-primary-100/70 bg-surface pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/70 focus:ring-2 focus:ring-primary-500"
              value={organizationSearch}
              onChange={(event) => setOrganizationSearch(event.target.value)}
              placeholder="Search organization"
            />
          </label>

          <Select
            label="View as organization"
            value={selectedOrganizationId}
            options={organizationOptions}
            onChange={(event) => setSelectedOrganizationId(event.target.value)}
            disabled={organizationsQuery.isLoading}
          />
        </div>
      </div>
    </header>
  )
}

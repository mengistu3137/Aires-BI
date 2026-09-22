import { useEffect, useMemo } from 'react'
import { Bars3Icon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import Logo from '../../../components/Logo'
import { Button } from '../../../components/ui/button'
import { Select } from '../../../components/ui/select'
import { Input } from '../../../components/ui/input'
import { useAuthStore } from '../../../store/auth-store'
import { useBranchFilterStore } from '../../../store/branch-filter-store'
import { useUiStore } from '../../../store/ui-store'
import { userService } from '../../users/user.service'
import { useManagerStore } from '../manager.store'

const PERIOD_OPTIONS = [
  { label: 'Today', value: 'TODAY' },
  { label: 'This Week', value: 'WEEK' },
  { label: 'Custom', value: 'CUSTOM' },
]

export function Topbar() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const clearSession = useAuthStore((state) => state.clearSession)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  const selectedBranchId = useBranchFilterStore((state) => state.selectedBranchId)
  const setSelectedBranchId = useBranchFilterStore((state) => state.setSelectedBranchId)
  const period = useManagerStore((state) => state.period)
  const dateRange = useManagerStore((state) => state.dateRange)
  const setPeriod = useManagerStore((state) => state.setPeriod)
  const setDateRange = useManagerStore((state) => state.setDateRange)

  const branchesQuery = useQuery({
    queryKey: ['manager-branches'],
    queryFn: () => userService.listBranches(),
  })

  const visibleBranches = useMemo(() => {
    const branches = branchesQuery.data || []
    if (role !== 'MANAGER') return branches

    const allowedIds = new Set(
      [
        ...(Array.isArray(user?.allowedBranchIds) ? user.allowedBranchIds : []),
        ...(Array.isArray(user?.branches) ? user.branches.map((item) => item?.id) : []),
        user?.branchId,
      ].filter(Boolean),
    )

    if (!allowedIds.size) return branches
    return branches.filter((branch) => allowedIds.has(branch.id))
  }, [branchesQuery.data, role, user])

  const branchOptions = useMemo(() => {
    const options = visibleBranches.map((branch) => ({
      label: branch.name,
      value: branch.id,
    }))

    if (role === 'MANAGER' && visibleBranches.length <= 1) {
      return options
    }

    return [
      { label: role === 'MANAGER' ? 'All Allowed Branches' : 'All Branches', value: 'ALL' },
    ].concat(options)
  }, [role, visibleBranches])

  const hasSingleManagerBranch = role === 'MANAGER' && visibleBranches.length === 1
  const isSelectedBranchVisible =
    selectedBranchId === 'ALL' || visibleBranches.some((branch) => branch.id === selectedBranchId)

  useEffect(() => {
    if (hasSingleManagerBranch && selectedBranchId !== visibleBranches[0]?.id) {
      setSelectedBranchId(visibleBranches[0].id)
    }
  }, [hasSingleManagerBranch, selectedBranchId, setSelectedBranchId, visibleBranches])

  useEffect(() => {
    if (role === 'MANAGER' && !hasSingleManagerBranch && !isSelectedBranchVisible) {
      setSelectedBranchId('ALL')
    }
  }, [hasSingleManagerBranch, isSelectedBranchVisible, role, setSelectedBranchId])

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
                  Manager Workspace
                </p>
                <p className="text-sm font-semibold text-text-primary">
                  Branch operations and analytics
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-text-primary">
                {user?.name || 'Manager User'}
              </p>
              <p className="text-xs uppercase text-text-secondary">{role || 'MANAGER'}</p>
            </div>
            <Button variant="ghost" className="gap-2" onClick={onLogout}>
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <Select
            label="Branch"
            value={selectedBranchId}
            options={branchOptions}
            disabled={hasSingleManagerBranch}
            onChange={(event) => setSelectedBranchId(event.target.value)}
          />

          <Select
            label="Date Filter"
            value={period}
            options={PERIOD_OPTIONS}
            onChange={(event) => setPeriod(event.target.value)}
          />

          <Input
            label="Start Date"
            type="date"
            value={dateRange.startDate}
            disabled={period !== 'CUSTOM'}
            onChange={(event) => setDateRange({ startDate: event.target.value })}
          />

          <Input
            label="End Date"
            type="date"
            value={dateRange.endDate}
            disabled={period !== 'CUSTOM'}
            onChange={(event) => setDateRange({ endDate: event.target.value })}
          />
        </div>
      </div>
    </header>
  )
}

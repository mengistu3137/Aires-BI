import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '../../../components/ui/badge'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { superAdminService } from '../../../services/super-admin.service'
import { formatCurrency } from '../../../utils/format'

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getActivityTone(type) {
  if (type === 'ORDER_CREATED') return 'bg-primary-500'
  if (type === 'PAYMENT_MADE') return 'bg-secondary-500'
  if (type === 'USER_CREATED') return 'bg-primary-300'
  return 'bg-primary-400'
}

export function SuperAdminActivityPage() {
  const activityQuery = useQuery({
    queryKey: ['super-admin-activity-feed'],
    queryFn: () => superAdminService.activity({ limit: 80 }),
    staleTime: 60_000,
  })

  const rows = useMemo(() => activityQuery.data || [], [activityQuery.data])

  if (activityQuery.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (activityQuery.isError) {
    return (
      <div className="grid gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Global Activity</h1>
          <p className="mt-1 text-sm text-text-secondary">Recent actions across the platform.</p>
        </header>

        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">Failed to load activity feed.</p>
          <button
            className="mt-3 rounded-2xl border border-secondary-200 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-100"
            onClick={() => activityQuery.refetch()}
          >
            Retry
          </button>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Global Activity</h1>
        <p className="mt-1 text-sm text-text-secondary">Recent actions across system operations.</p>
      </header>

      <Card className="rounded-3xl">
        {!rows.length ? (
          <p className="text-sm text-text-secondary">No recent activity found.</p>
        ) : (
          <ol className="relative border-s border-primary-100/70 ps-6">
            {rows.map((row) => {
              const amount = Number(row?.meta?.amount || 0)
              const isMoney = row.type === 'PAYMENT_MADE' || row.type === 'ORDER_CREATED'

              return (
                <li key={row.id} className="mb-8 ms-3">
                  <span
                    className={`absolute -start-2.25 mt-1.5 h-4 w-4 rounded-full ring-4 ring-surface ${getActivityTone(row.type)}`}
                  />

                  <div className="rounded-2xl border border-primary-100/70 bg-surface p-4 shadow-soft">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">{row.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge value={row.type} />
                        <span className="text-xs text-text-secondary">
                          {formatDateTime(row.createdAt)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-text-secondary">{row.description}</p>

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
                      <span>Organization: {row.organization?.name || 'Global'}</span>
                      <span>Branch: {row.branch?.name || '-'}</span>
                      <span>Actor: {row.actor?.name || '-'}</span>
                      {isMoney ? <span>Amount: {formatCurrency(amount)}</span> : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </div>
  )
}

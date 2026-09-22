import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { Table } from '../../../components/ui/table'
import { reportsService } from '../../../services/reports.service'
import { useBranchFilterStore } from '../../../store/branch-filter-store'
import { formatCurrency } from '../../../utils/format'
import { useManagerStore } from '../manager.store'

const VIEW_OPTIONS = {
  ALL: 'ALL',
  SERVER: 'SERVER',
  CASHIER: 'CASHIER',
  CHEF: 'CHEF',
}

const PERIOD_OPTIONS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
}

function getPeriodRange(period) {
  const now = new Date()

  if (period === PERIOD_OPTIONS.DAILY) {
    const today = now.toISOString().slice(0, 10)
    return {
      startDate: today,
      endDate: today,
    }
  }

  const day = now.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(now)
  start.setDate(now.getDate() + mondayOffset)

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  }
}

function normalizeRows(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.rows)) return data.rows
  if (Array.isArray(data?.items)) return data.items
  return []
}

function getName(row) {
  return row.user?.name || row.name || row.staffName || '-'
}

function getRole(row) {
  return String(row.user?.role || row.role || 'UNKNOWN').toUpperCase()
}

function getOrdersHandled(row) {
  return Number(
    row.ordersHandled ??
      row.ordersServed ??
      row.ordersPrepared ??
      row.orders ??
      row.totalOrders ??
      0,
  )
}

function getPaymentsCollected(row) {
  return Number(
    row.paymentsCollected ?? row.payments ?? row.totalPayments ?? row.paymentsCount ?? 0,
  )
}

function getRevenueGenerated(row) {
  return Number(row.revenueGenerated ?? row.revenue ?? row.totalRevenue ?? row.moneyHandled ?? 0)
}

function metricLabel(view) {
  if (view === VIEW_OPTIONS.SERVER) return 'Orders served'
  if (view === VIEW_OPTIONS.CASHIER) return 'Money handled'
  if (view === VIEW_OPTIONS.CHEF) return 'Orders prepared'
  return 'Primary metric'
}

function metricValue(row, view) {
  if (view === VIEW_OPTIONS.SERVER) return String(getOrdersHandled(row))
  if (view === VIEW_OPTIONS.CASHIER) return formatCurrency(getRevenueGenerated(row))
  if (view === VIEW_OPTIONS.CHEF) return String(getOrdersHandled(row))
  return `${getOrdersHandled(row)} / ${formatCurrency(getRevenueGenerated(row))}`
}

export function ManagerStaffPerformancePage() {
  const selectedBranchId = useBranchFilterStore((state) => state.selectedBranchId)
  const [view, setView] = useState(VIEW_OPTIONS.ALL)
  const [period, setPeriod] = useState(PERIOD_OPTIONS.DAILY)

  const periodRange = useMemo(() => getPeriodRange(period), [period])

  const params = useMemo(
    () => ({
      ...(selectedBranchId !== 'ALL' ? { branchId: selectedBranchId } : {}),
      ...(periodRange.startDate ? { startDate: periodRange.startDate } : {}),
      ...(periodRange.endDate ? { endDate: periodRange.endDate } : {}),
    }),
    [selectedBranchId, periodRange],
  )

  const staffQuery = useQuery({
    queryKey: [
      'manager-staff-performance',
      selectedBranchId,
      period,
      periodRange.startDate,
      periodRange.endDate,
    ],
    queryFn: () => reportsService.staff(params),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  })

  const allRows = useMemo(() => normalizeRows(staffQuery.data), [staffQuery.data])

  const rows = useMemo(() => {
    if (view === VIEW_OPTIONS.ALL) return allRows
    return allRows.filter((row) => getRole(row) === view)
  }, [allRows, view])

  const rankedRows = useMemo(() => {
    return [...rows]
      .sort((a, b) => {
        if (view === VIEW_OPTIONS.CASHIER) {
          return getRevenueGenerated(b) - getRevenueGenerated(a)
        }

        return getOrdersHandled(b) - getOrdersHandled(a)
      })
      .slice(0, 5)
  }, [rows, view])

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.staff += 1
        acc.orders += getOrdersHandled(row)
        acc.payments += getPaymentsCollected(row)
        acc.revenue += getRevenueGenerated(row)
        return acc
      },
      { staff: 0, orders: 0, payments: 0, revenue: 0 },
    )
  }, [rows])

  const columns = [
    {
      key: 'name',
      title: 'Staff',
      render: (row) => getName(row),
    },
    {
      key: 'role',
      title: 'Role',
      render: (row) => getRole(row),
    },
    {
      key: 'orders',
      title: 'Orders Handled',
      render: (row) => String(getOrdersHandled(row)),
    },
    {
      key: 'payments',
      title: 'Payments Collected',
      render: (row) => String(getPaymentsCollected(row)),
    },
    {
      key: 'revenue',
      title: 'Revenue Generated',
      render: (row) => formatCurrency(getRevenueGenerated(row)),
    },
    {
      key: 'metric',
      title: metricLabel(view),
      render: (row) => metricValue(row, view),
    },
  ]

  if (staffQuery.isLoading) {
    return <ManagerStaffSkeleton />
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Staff Performance</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Daily and weekly analytics for servers, cashiers, and chefs.
        </p>
      </header>

      <Card className="rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPeriod(PERIOD_OPTIONS.DAILY)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                period === PERIOD_OPTIONS.DAILY
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-primary-50/70 text-text-secondary hover:bg-primary-100/60'
              }`}
            >
              Daily
            </button>
            <button
              type="button"
              onClick={() => setPeriod(PERIOD_OPTIONS.WEEKLY)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                period === PERIOD_OPTIONS.WEEKLY
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-primary-50/70 text-text-secondary hover:bg-primary-100/60'
              }`}
            >
              Weekly
            </button>
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={() => staffQuery.refetch()}>
            Refresh
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { key: VIEW_OPTIONS.ALL, label: 'All Staff' },
            { key: VIEW_OPTIONS.SERVER, label: 'Servers' },
            { key: VIEW_OPTIONS.CASHIER, label: 'Cashiers' },
            { key: VIEW_OPTIONS.CHEF, label: 'Chefs' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                view === item.key
                  ? 'bg-secondary-100 text-secondary-700'
                  : 'bg-primary-50/70 text-text-secondary hover:bg-primary-100/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Card>

      {staffQuery.isError ? (
        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">
            {staffQuery.error?.message || 'Failed to load staff analytics'}
          </p>
          <div className="mt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => staffQuery.refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active Staff" value={String(summary.staff)} />
        <StatCard title="Orders Handled" value={String(summary.orders)} />
        <StatCard title="Payments Collected" value={String(summary.payments)} />
        <StatCard title="Revenue Generated" value={formatCurrency(summary.revenue)} />
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-3xl lg:col-span-2">
          <Table
            columns={columns}
            rows={rows}
            isLoading={staffQuery.isFetching}
            loadingText="Refreshing staff performance..."
            emptyText="No staff performance data for selected view"
          />
        </Card>

        <Card className="rounded-3xl">
          <h3 className="text-base font-semibold text-text-primary">Top Performers</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Ranking based on{' '}
            {view === VIEW_OPTIONS.CASHIER ? 'money handled' : 'orders contribution'}.
          </p>

          <div className="mt-4 space-y-3">
            {rankedRows.length ? (
              rankedRows.map((row, index) => (
                <div
                  key={row.id || `${getName(row)}-${index}`}
                  className="rounded-2xl border border-primary-100/70 bg-primary-50/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-text-primary">
                      #{index + 1} {getName(row)}
                    </p>
                    <p className="text-sm font-semibold text-primary-700">
                      {metricValue(row, view)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary">{getRole(row)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">No ranking data available.</p>
            )}
          </div>
        </Card>
      </section>

      {staffQuery.isFetching ? (
        <p className="text-sm text-text-secondary">Updating analytics...</p>
      ) : null}
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <Card className="rounded-3xl">
      <p className="text-sm text-text-secondary">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-primary-700">{value}</p>
    </Card>
  )
}

function ManagerStaffSkeleton() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Staff Performance</h1>
        <p className="mt-1 text-sm text-text-secondary">Loading staff analytics...</p>
      </header>

      <Skeleton className="h-32" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}

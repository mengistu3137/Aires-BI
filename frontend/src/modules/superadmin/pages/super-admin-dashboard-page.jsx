import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { Select } from '../../../components/ui/select'
import { superAdminService } from '../../../services/super-admin.service'
import { formatCurrency } from '../../../utils/format'

const CURRENT_YEAR = new Date().getFullYear()

const MONTH_OPTIONS = [{ label: 'All Months', value: 'ALL' }].concat(
  Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
      new Date(2024, index, 1, 0, 0, 0),
    ),
    value: String(index + 1),
  })),
)

const YEAR_OPTIONS = [{ label: 'All Years', value: 'ALL' }].concat(
  Array.from({ length: 6 }, (_, index) => {
    const year = String(CURRENT_YEAR - index)
    return { label: year, value: year }
  }),
)

function pickNumber(...candidates) {
  for (const value of candidates) {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return 0
}

function monthLabel(value) {
  const date = new Date(`${value}-01T00:00:00`)
  if (!Number.isFinite(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit' }).format(date)
}

function toTrendLabel(rawDate) {
  const dateText = String(rawDate || '').trim()
  if (!dateText) return '-'

  if (/^\d{4}-\d{2}$/.test(dateText)) {
    return monthLabel(dateText)
  }

  const parsed = new Date(dateText)
  if (Number.isFinite(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(parsed)
  }

  return dateText
}

function normalizeTrendRows(rows, valueKeys) {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row) => ({
      date: row?.date || row?.month || row?.label || row?.period,
      value: pickNumber(...valueKeys.map((key) => row?.[key])),
    }))
    .filter((row) => row.date)
}

function normalizeGrowthStats(metrics) {
  const growth = metrics?.growthStats || metrics?.growth || {}

  const organizationGrowth = normalizeTrendRows(
    growth?.organizationGrowth ||
      growth?.organizations ||
      metrics?.organizationGrowth ||
      metrics?.organizationTrend ||
      [],
    ['organizations', 'totalOrganizations', 'count', 'value'],
  ).map((row) => ({ ...row, organizations: row.value }))

  const revenueTrend = normalizeTrendRows(
    growth?.revenueTrend ||
      growth?.revenue ||
      metrics?.revenueTrend ||
      metrics?.revenueOverTime ||
      [],
    ['revenue', 'totalRevenue', 'amount', 'value'],
  ).map((row) => ({ ...row, revenue: row.value }))

  return {
    organizationGrowth,
    revenueTrend,
  }
}

export function SuperAdminDashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [selectedYear, setSelectedYear] = useState('ALL')

  const analyticsFilters = useMemo(
    () => ({
      ...(selectedMonth !== 'ALL' ? { month: Number(selectedMonth) } : {}),
      ...(selectedYear !== 'ALL' ? { year: Number(selectedYear) } : {}),
    }),
    [selectedMonth, selectedYear],
  )

  const metricsQuery = useQuery({
    queryKey: ['super-admin-analytics', selectedMonth, selectedYear],
    queryFn: () => superAdminService.analytics(analyticsFilters),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })

  const metrics = metricsQuery.data || {}

  const totalOrganizations = pickNumber(
    metrics.totalOrganizations,
    metrics?.kpis?.totalOrganizations,
  )

  const totalUsers = pickNumber(metrics.totalUsers, metrics.activeUsers, metrics?.kpis?.totalUsers)

  const totalOrders = pickNumber(
    metrics.totalOrders,
    metrics.platformOrders,
    metrics.orders,
    metrics?.kpis?.totalOrders,
  )

  const totalRevenue = pickNumber(
    metrics.totalRevenue,
    metrics.platformRevenue,
    metrics.revenue,
    metrics?.kpis?.totalRevenue,
  )

  const growthStats = useMemo(() => normalizeGrowthStats(metrics), [metrics])

  const orgGrowthData = useMemo(
    () =>
      growthStats.organizationGrowth.map((row) => ({
        ...row,
        label: toTrendLabel(row.date),
      })),
    [growthStats.organizationGrowth],
  )

  const revenueTrendData = useMemo(
    () =>
      growthStats.revenueTrend.map((row) => ({
        ...row,
        label: toTrendLabel(row.date),
      })),
    [growthStats.revenueTrend],
  )

  const isLoading = metricsQuery.isLoading
  const hasError = metricsQuery.isError

  if (isLoading) {
    return <SuperAdminDashboardSkeleton />
  }

  if (hasError) {
    return (
      <div className="grid gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
            Super Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Unable to load platform data.</p>
        </header>

        <Card className="rounded-3xl border-secondary-200 bg-secondary-50 p-5">
          <p className="text-sm text-secondary-700">
            Failed to fetch analytics data. Please try again.
          </p>
          <button
            className="mt-3 rounded-xl border border-secondary-200 px-3 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-100"
            onClick={() => metricsQuery.refetch()}
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
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          Super Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Centralized platform intelligence across organizations, users, and operations.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2 lg:max-w-xl">
        <Select
          label="Month"
          value={selectedMonth}
          options={MONTH_OPTIONS}
          onChange={(event) => setSelectedMonth(event.target.value)}
        />
        <Select
          label="Year"
          value={selectedYear}
          options={YEAR_OPTIONS}
          onChange={(event) => setSelectedYear(event.target.value)}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Organizations" value={String(totalOrganizations)} />
        <SummaryCard title="Active Users" value={String(totalUsers)} />
        <SummaryCard title="Total Orders (Platform)" value={String(totalOrders)} />
        <SummaryCard title="Total Revenue (Platform)" value={formatCurrency(totalRevenue)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Organization Growth" subtitle="Cumulative organization growth by month">
          {orgGrowthData.length ? (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={orgGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => String(value)} />
                  <Line
                    type="monotone"
                    dataKey="organizations"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              No organization growth data for selected filter.
            </p>
          )}
        </ChartCard>

        <ChartCard title="Revenue Trend" subtitle="Platform revenue by month">
          {revenueTrendData.length ? (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={revenueTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              No revenue trend data for selected filter.
            </p>
          )}
        </ChartCard>
      </section>

      {metricsQuery.isFetching ? (
        <p className="text-sm text-text-secondary">Refreshing platform metrics...</p>
      ) : null}
    </div>
  )
}

function SummaryCard({ title, value }) {
  return (
    <Card className="rounded-3xl border-primary-100/70 p-5">
      <p className="text-sm text-text-secondary">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
    </Card>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="rounded-3xl border-primary-100/70 p-5">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  )
}

function SuperAdminDashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          Super Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-text-secondary">Loading platform metrics...</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </section>
    </div>
  )
}

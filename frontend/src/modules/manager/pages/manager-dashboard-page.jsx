import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { reportsService } from '../../../services/reports.service'
import { useBranchFilterStore } from '../../../store/branch-filter-store'
import { formatCurrency } from '../../../utils/format'
import { InsightListCard } from '../components/insight-list-card'
import { ManagerChartCard } from '../components/manager-chart-card'
import { ManagerSummaryCard } from '../components/manager-summary-card'
import { useManagerStore } from '../manager.store'

const PIE_COLORS = ['#1e5bff', '#ff7f11', '#93b1ff']

function normalizeRows(data) {
  const rows = data?.rows || data?.items || data || []
  return Array.isArray(rows) ? rows : []
}

function pickNumber(...candidates) {
  for (const value of candidates) {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return 0
}

function isOrderOpen(status) {
  return status === 'PENDING' || status === 'PREPARING' || status === 'IN_PROGRESS'
}

export function ManagerDashboardPage() {
  const selectedBranchId = useBranchFilterStore((state) => state.selectedBranchId)
  const period = useManagerStore((state) => state.period)
  const dateRange = useManagerStore((state) => state.dateRange)

  const params = useMemo(
    () => ({
      ...(selectedBranchId !== 'ALL' ? { branchId: selectedBranchId } : {}),
      ...(dateRange.startDate ? { startDate: dateRange.startDate } : {}),
      ...(dateRange.endDate ? { endDate: dateRange.endDate } : {}),
    }),
    [selectedBranchId, dateRange],
  )

  const dashboardQuery = useQuery({
    queryKey: [
      'manager-dashboard-summary',
      selectedBranchId,
      period,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () => reportsService.dashboard(params),
    staleTime: 60_000,
  })

  const salesQuery = useQuery({
    queryKey: [
      'manager-dashboard-sales',
      selectedBranchId,
      period,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () => reportsService.sales(params),
    staleTime: 60_000,
  })

  const paymentsQuery = useQuery({
    queryKey: [
      'manager-dashboard-payments',
      selectedBranchId,
      period,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () => reportsService.payments(params),
    staleTime: 60_000,
  })

  const dashboard = dashboardQuery.data || {}
  const salesRows = useMemo(() => normalizeRows(salesQuery.data), [salesQuery.data])
  const salesSummary = salesQuery.data?.summary || {}
  const paymentSummary = paymentsQuery.data?.summary || {}

  const totalRevenueToday = pickNumber(
    dashboard.totalRevenueToday,
    dashboard.todayRevenue,
    dashboard.revenueToday,
    salesSummary.totalRevenue,
    salesSummary.totalAmount,
  )

  const totalOrders = pickNumber(dashboard.totalOrders, salesSummary.totalOrders, salesRows.length)

  const completedOrders = pickNumber(
    dashboard.completedOrders,
    salesSummary.completedOrders,
    salesRows.filter((row) => row?.status === 'COMPLETED').length,
  )

  const pendingOrders = pickNumber(
    dashboard.pendingOrders,
    salesSummary.pendingOrders,
    salesRows.filter((row) => row?.status === 'PENDING' || row?.status === 'PREPARING').length,
  )

  const revenueOverTime = useMemo(() => {
    const buckets = new Map()

    salesRows.forEach((row) => {
      const key = String(row.date || row.createdAt || '').slice(0, 10)
      if (!key) return
      buckets.set(
        key,
        (buckets.get(key) || 0) + pickNumber(row.revenue, row.amount, row.totalAmount),
      )
    })

    return [...buckets.entries()]
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([date, revenue]) => ({ date, revenue }))
  }, [salesRows])

  const paymentMethods = [
    { name: 'Cash', value: pickNumber(paymentSummary.cash) },
    { name: 'Bank', value: pickNumber(paymentSummary.bank) },
    { name: 'Mobile', value: pickNumber(paymentSummary.mobile, paymentSummary.mobileMoney) },
  ]

  const topSellingProducts = useMemo(() => {
    const products = new Map()

    salesRows.forEach((row) => {
      ;(row.items || row.products || []).forEach((item) => {
        const key = item.productId || item.product?.id || item.name || 'unknown'
        const current = products.get(key) || {
          name: item.product?.name || item.name || 'Product',
          qty: 0,
        }
        current.qty += pickNumber(item.quantity, item.qty, item.count)
        products.set(key, current)
      })
    })

    return [...products.entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((item) => ({
        key: item.key,
        title: item.name,
        caption: 'Units sold',
        value: String(item.qty),
      }))
  }, [salesRows])

  const busiestHour = useMemo(() => {
    const hours = new Map()

    salesRows.forEach((row) => {
      const source = row.hour ?? row.createdAt
      if (source === undefined || source === null || source === '') return

      const hour = Number.isFinite(Number(source)) ? Number(source) : new Date(source).getHours()

      if (!Number.isFinite(hour)) return

      const count = pickNumber(row.orders, row.orderCount, row.count, 1)
      hours.set(hour, (hours.get(hour) || 0) + count)
    })

    const peak = [...hours.entries()].sort((a, b) => b[1] - a[1])[0]
    if (!peak) {
      return [
        { key: 'none', title: 'No order activity', caption: 'No orders in range', value: '-' },
      ]
    }

    const hourLabel = `${String(peak[0]).padStart(2, '0')}:00 - ${String((peak[0] + 1) % 24).padStart(2, '0')}:00`

    return [
      {
        key: String(peak[0]),
        title: hourLabel,
        caption: 'Peak order volume window',
        value: `${peak[1]} orders`,
      },
    ]
  }, [salesRows])

  const delayedOrdersOver20 = useMemo(() => {
    const now = Date.now()
    return salesRows.filter((row) => {
      if (!isOrderOpen(row?.status)) return false
      if (!row?.createdAt) return false
      const createdAtMs = new Date(row.createdAt).getTime()
      if (!Number.isFinite(createdAtMs)) return false
      return now - createdAtMs > 20 * 60 * 1000
    }).length
  }, [salesRows])

  const insights = useMemo(() => {
    const list = []
    const cash = pickNumber(paymentSummary.cash)
    const bank = pickNumber(paymentSummary.bank)
    const mobile = pickNumber(paymentSummary.mobile, paymentSummary.mobileMoney)
    const totalPayments = cash + bank + mobile
    const cashShare = totalPayments > 0 ? cash / totalPayments : 0

    if (delayedOrdersOver20 >= 3) {
      list.push({
        key: 'delayed-orders',
        tone: delayedOrdersOver20 >= 8 ? 'critical' : 'warning',
        message: `⚠ ${delayedOrdersOver20} orders delayed > 20 min`,
      })
    }

    if (cash >= 2000 && cashShare >= 0.7) {
      list.push({
        key: 'cash-spike',
        tone: 'warning',
        message: '💰 Cash payments unusually high today',
      })
    }

    const overloadedChef =
      pendingOrders >= 8 || (totalOrders > 0 && pendingOrders / totalOrders >= 0.45)
    if (overloadedChef) {
      list.push({
        key: 'chef-overloaded',
        tone: pendingOrders >= 12 ? 'critical' : 'warning',
        message: '👨‍🍳 Chef overloaded',
      })
    }

    if (!list.length) {
      list.push({
        key: 'healthy-ops',
        tone: 'ok',
        message: '✅ Operations stable. No critical alerts right now.',
      })
    }

    return list
  }, [delayedOrdersOver20, paymentSummary, pendingOrders, totalOrders])

  const isLoading = dashboardQuery.isLoading || salesQuery.isLoading || paymentsQuery.isLoading
  const hasError = dashboardQuery.isError || salesQuery.isError || paymentsQuery.isError

  const onRetry = () => {
    dashboardQuery.refetch()
    salesQuery.refetch()
    paymentsQuery.refetch()
  }

  if (isLoading) {
    return <ManagerDashboardSkeleton />
  }

  if (hasError) {
    return (
      <div className="grid gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
            Manager Dashboard
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Unable to load report analytics right now.
          </p>
        </header>

        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">
            Failed to fetch dashboard metrics. Please try again.
          </p>
          <div className="mt-3">
            <Button type="button" variant="ghost" onClick={onRetry}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Real-time operational view for orders, payments, and staff productivity.
        </p>
      </header>

      <section className="grid gap-3 lg:grid-cols-3">
        {insights.map((insight) => (
          <ManagerAlertCard key={insight.key} tone={insight.tone} message={insight.message} />
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ManagerSummaryCard
          title="Total Revenue Today"
          value={formatCurrency(totalRevenueToday)}
          accent="primary"
        />
        <ManagerSummaryCard title="Total Orders" value={String(totalOrders)} accent="secondary" />
        <ManagerSummaryCard
          title="Completed Orders"
          value={String(completedOrders)}
          accent="primary"
        />
        <ManagerSummaryCard
          title="Pending Orders"
          value={String(pendingOrders)}
          accent="secondary"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-5">
        <ManagerChartCard
          title="Revenue Over Time"
          subtitle="Daily revenue trend for the selected range"
          className="xl:col-span-3"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1e5bff"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ManagerChartCard>

        <ManagerChartCard
          title="Payment Methods"
          subtitle="Cash, bank, and mobile split"
          className="xl:col-span-2"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={paymentMethods}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={88}
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ManagerChartCard>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <InsightListCard
          title="Top Selling Products"
          subtitle="Best items by quantity sold"
          items={topSellingProducts}
          emptyText="No product sales in selected range"
        />

        <InsightListCard
          title="Busiest Hour"
          subtitle="Most active order period"
          items={busiestHour}
          emptyText="No order activity in selected range"
        />
      </section>

      {dashboardQuery.isFetching || salesQuery.isFetching || paymentsQuery.isFetching ? (
        <p className="text-sm text-text-secondary">Refreshing dashboard data...</p>
      ) : null}
    </div>
  )
}

function ManagerAlertCard({ tone, message }) {
  const toneClasses = {
    ok: 'border-primary-100/70 bg-primary-50/70 text-primary-700',
    warning: 'border-secondary-200 bg-secondary-100 text-secondary-700',
    critical: 'border-secondary-300 bg-secondary-100 text-secondary-700',
  }

  return (
    <Card
      className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone] || toneClasses.warning}`}
    >
      <p className="text-sm font-semibold">{message}</p>
    </Card>
  )
}

function ManagerDashboardSkeleton() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">Loading analytics...</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-5">
        <Skeleton className="h-80 xl:col-span-3" />
        <Skeleton className="h-80 xl:col-span-2" />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </section>
    </div>
  )
}

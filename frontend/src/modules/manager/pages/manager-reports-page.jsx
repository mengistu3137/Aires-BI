import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import { useManagerStore } from '../manager.store'

function normalizeRows(data) {
  const rows = data?.rows || data?.items || data || []
  return Array.isArray(rows) ? rows : []
}

function toMonthKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toDayKey(value) {
  return String(value || '').slice(0, 10)
}

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function ManagerReportsPage() {
  const selectedBranchId = useBranchFilterStore((state) => state.selectedBranchId)
  const period = useManagerStore((state) => state.period)
  const dateRange = useManagerStore((state) => state.dateRange)
  const [granularity, setGranularity] = useState('DAY')

  const params = useMemo(
    () => ({
      ...(selectedBranchId !== 'ALL' ? { branchId: selectedBranchId } : {}),
      ...(dateRange.startDate ? { startDate: dateRange.startDate } : {}),
      ...(dateRange.endDate ? { endDate: dateRange.endDate } : {}),
    }),
    [selectedBranchId, dateRange],
  )

  const salesQuery = useQuery({
    queryKey: [
      'manager-reports-sales',
      selectedBranchId,
      period,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () => reportsService.sales(params),
    staleTime: 60_000,
  })

  const productsQuery = useQuery({
    queryKey: [
      'manager-reports-products',
      selectedBranchId,
      period,
      dateRange.startDate,
      dateRange.endDate,
    ],
    queryFn: () => reportsService.products(params),
    staleTime: 60_000,
  })

  const salesRows = useMemo(() => normalizeRows(salesQuery.data), [salesQuery.data])
  const productsRows = useMemo(() => normalizeRows(productsQuery.data), [productsQuery.data])

  const salesTrend = useMemo(() => {
    const buckets = new Map()

    salesRows.forEach((row) => {
      const createdAt = row.date || row.createdAt
      const key = granularity === 'MONTH' ? toMonthKey(createdAt) : toDayKey(createdAt)
      if (!key) return

      if (!buckets.has(key)) {
        buckets.set(key, {
          period: key,
          revenue: 0,
          orders: 0,
        })
      }

      const bucket = buckets.get(key)
      bucket.revenue += Number(row.revenue ?? row.amount ?? row.totalAmount ?? 0)
      bucket.orders += Number(row.orders ?? row.orderCount ?? row.count ?? 1)
    })

    return [...buckets.values()].sort((a, b) => (a.period > b.period ? 1 : -1))
  }, [salesRows, granularity])

  const topProducts = useMemo(() => {
    const map = new Map()

    productsRows.forEach((row) => {
      const key = row.productId || row.id || row.name || 'unknown'
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: row.name || row.product?.name || 'Product',
          category: row.category || row.product?.category?.name || 'Uncategorized',
          qty: 0,
          revenue: 0,
        })
      }

      const item = map.get(key)
      item.qty += Number(row.quantity ?? row.sold ?? row.orders ?? 0)
      item.revenue += Number(row.revenue ?? row.amount ?? row.totalAmount ?? 0)
    })

    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8)
  }, [productsRows])

  const categoryPerformance = useMemo(() => {
    const categoryMap = new Map()

    topProducts.forEach((item) => {
      const key = item.category || 'Uncategorized'
      if (!categoryMap.has(key)) {
        categoryMap.set(key, { category: key, revenue: 0, items: 0 })
      }

      const bucket = categoryMap.get(key)
      bucket.revenue += item.revenue
      bucket.items += item.qty
    })

    return [...categoryMap.values()].sort((a, b) => b.revenue - a.revenue)
  }, [topProducts])

  const summary = useMemo(() => {
    return salesTrend.reduce(
      (acc, item) => {
        acc.revenue += item.revenue
        acc.orders += item.orders
        return acc
      },
      { revenue: 0, orders: 0 },
    )
  }, [salesTrend])

  const onExportCsv = () => {
    const header = 'Period,Revenue,Orders\n'
    const body = salesTrend
      .map((item) => `${item.period},${item.revenue},${item.orders}`)
      .join('\n')
    downloadBlob('manager-sales-report.csv', `${header}${body}`, 'text/csv;charset=utf-8')
  }

  const onDownloadReport = () => {
    const payload = {
      filters: {
        branchId: selectedBranchId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        granularity,
      },
      summary,
      salesTrend,
      topProducts,
      categoryPerformance,
      generatedAt: new Date().toISOString(),
    }

    downloadBlob('manager-report.json', JSON.stringify(payload, null, 2), 'application/json')
  }

  if (salesQuery.isLoading || productsQuery.isLoading) {
    return <ManagerReportsSkeleton />
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Professional reporting workspace for sales and product analytics.
        </p>
      </header>

      <Card className="rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setGranularity('DAY')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                granularity === 'DAY'
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-primary-50/70 text-text-secondary hover:bg-primary-100/60'
              }`}
            >
              Sales by Day
            </button>
            <button
              type="button"
              onClick={() => setGranularity('MONTH')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                granularity === 'MONTH'
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-primary-50/70 text-text-secondary hover:bg-primary-100/60'
              }`}
            >
              Sales by Month
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onExportCsv}>
              Export CSV
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDownloadReport}>
              Download Report
            </Button>
          </div>
        </div>
      </Card>

      {salesQuery.isError || productsQuery.isError ? (
        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">Failed to load reports data.</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => salesQuery.refetch()}>
              Retry Sales
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => productsQuery.refetch()}>
              Retry Products
            </Button>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard title="Total Revenue" value={formatCurrency(summary.revenue)} />
        <SummaryCard title="Total Orders" value={String(summary.orders)} />
        <SummaryCard title="Top Products" value={String(topProducts.length)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-3xl">
          <h3 className="text-base font-semibold text-text-primary">Revenue Trend</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Sales performance by selected time grouping.
          </p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer>
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tickLine={false} axisLine={false} />
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
        </Card>

        <Card className="rounded-3xl">
          <h3 className="text-base font-semibold text-text-primary">Category Performance</h3>
          <p className="mt-1 text-sm text-text-secondary">Revenue contribution by category.</p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="category" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#ff7f11" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card className="rounded-3xl">
        <h3 className="text-base font-semibold text-text-primary">Top Products</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Best performing items by revenue and volume.
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-primary-100/70">
          <table className="w-full min-w-160 text-left text-sm">
            <thead className="bg-primary-50 text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Units Sold</th>
                <th className="px-4 py-3 font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100/60 bg-surface text-text-secondary">
              {topProducts.map((item) => (
                <tr key={item.key} className="hover:bg-primary-50/70">
                  <td className="px-4 py-3 font-medium text-text-primary">{item.name}</td>
                  <td className="px-4 py-3">{item.category}</td>
                  <td className="px-4 py-3">{item.qty}</td>
                  <td className="px-4 py-3 font-semibold text-primary-700">
                    {formatCurrency(item.revenue)}
                  </td>
                </tr>
              ))}
              {!topProducts.length ? (
                <tr>
                  <td className="px-4 py-6 text-center text-text-secondary" colSpan={4}>
                    No products data for selected filters
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function SummaryCard({ title, value }) {
  return (
    <Card className="rounded-3xl">
      <p className="text-sm text-text-secondary">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-primary-700">{value}</p>
    </Card>
  )
}

function ManagerReportsSkeleton() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Reports</h1>
        <p className="mt-1 text-sm text-text-secondary">Loading reports workspace...</p>
      </header>

      <Skeleton className="h-20" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

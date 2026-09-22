import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../../../components/ui/card'
import { reportsService } from '../../../services/reports.service'
import { formatCurrency } from '../../../utils/format'
import { ReportsToolbar } from '../components/reports-toolbar'

function initialRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 6)

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export function SalesReportPage() {
  const [draftRange, setDraftRange] = useState(initialRange)
  const [appliedRange, setAppliedRange] = useState(initialRange)

  const params = useMemo(
    () => ({
      startDate: appliedRange.startDate,
      endDate: appliedRange.endDate,
    }),
    [appliedRange],
  )

  const dashboardQuery = useQuery({
    queryKey: ['report-dashboard', params],
    queryFn: () => reportsService.dashboard(params),
  })

  const financeQuery = useQuery({
    queryKey: ['report-finance-sales-page', params],
    queryFn: () => reportsService.finance(params),
  })

  const dashboard = dashboardQuery.data || {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    paymentBreakdown: { cash: 0, bank: 0, mobile: 0 },
  }

  const ordersPerDay = useMemo(() => {
    const rows = financeQuery.data?.rows || []
    const map = new Map()

    rows.forEach((row) => {
      const key = row.createdAt?.slice(0, 10)
      if (!key) return

      if (!map.has(key)) {
        map.set(key, {
          date: key,
          amount: 0,
          orderIds: new Set(),
        })
      }

      const bucket = map.get(key)
      bucket.amount += row.amount || 0
      if (row.orderId) {
        bucket.orderIds.add(row.orderId)
      }
    })

    return [...map.values()]
      .sort((a, b) => (a.date > b.date ? 1 : -1))
      .map((item) => ({
        date: item.date,
        orders: item.orderIds.size,
        revenue: item.amount,
      }))
  }, [financeQuery.data])

  const paymentBars = [
    { label: 'Cash', value: dashboard.paymentBreakdown.cash },
    { label: 'Bank', value: dashboard.paymentBreakdown.bank },
    { label: 'Mobile', value: dashboard.paymentBreakdown.mobile },
  ]

  return (
    <div className="grid gap-6">
      <ReportsToolbar
        title="Sales Report"
        description="Revenue, order volume, and payment channel distribution."
        draftRange={draftRange}
        onRangeChange={setDraftRange}
        onApply={() => setAppliedRange(draftRange)}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat title="Total Sales" value={formatCurrency(dashboard.totalRevenue)} accent="primary" />
        <Stat title="Total Orders" value={String(dashboard.totalOrders)} accent="secondary" />
        <Stat
          title="Average Order Value"
          value={formatCurrency(dashboard.averageOrderValue)}
          accent="primary"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-3xl border-slate-200/80 p-5">
          <h3 className="text-base font-semibold text-slate-900">Orders Per Day</h3>
          <p className="mt-1 text-sm text-slate-600">Date-filtered order count trend</p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={ordersPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="#1e5bff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 p-5">
          <h3 className="text-base font-semibold text-slate-900">Cash vs Bank vs Mobile</h3>
          <p className="mt-1 text-sm text-slate-600">Payment mix by total value</p>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={paymentBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#ff7f11" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {(dashboardQuery.isFetching || financeQuery.isFetching) && (
        <p className="text-sm text-slate-500">Refreshing report data...</p>
      )}
    </div>
  )
}

function Stat({ title, value, accent = 'primary' }) {
  return (
    <Card className="rounded-3xl border-slate-200/80 p-5">
      <p className="text-sm text-slate-500">{title}</p>
      <p
        className={
          accent === 'secondary'
            ? 'mt-2 text-2xl font-semibold text-secondary-600'
            : 'mt-2 text-2xl font-semibold text-primary-700'
        }
      >
        {value}
      </p>
    </Card>
  )
}

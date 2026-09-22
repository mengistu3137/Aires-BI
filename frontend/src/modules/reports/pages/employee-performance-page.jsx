import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../../components/ui/card'
import { Table } from '../../../components/ui/table'
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

export function EmployeePerformancePage() {
  const [draftRange, setDraftRange] = useState(initialRange)
  const [appliedRange, setAppliedRange] = useState(initialRange)

  const params = useMemo(
    () => ({
      startDate: appliedRange.startDate,
      endDate: appliedRange.endDate,
    }),
    [appliedRange],
  )

  const staffQuery = useQuery({
    queryKey: ['report-staff-performance', params],
    queryFn: () => reportsService.staffPerformance(params),
  })

  const rows = staffQuery.data || []

  const totals = rows.reduce(
    (acc, row) => {
      acc.sales += row.totalSales || 0
      acc.orders += row.totalOrders || 0
      return acc
    },
    { sales: 0, orders: 0 },
  )

  const topPerformer = rows[0]

  const chartRows = rows.slice(0, 10).map((row) => ({
    name: row.name,
    totalSales: row.totalSales,
    totalOrders: row.totalOrders,
  }))

  const columns = [
    { key: 'name', title: 'Employee', render: (row) => row.name },
    {
      key: 'totalSales',
      title: 'Total Sales',
      render: (row) => (
        <span className="font-semibold text-primary-700">{formatCurrency(row.totalSales)}</span>
      ),
    },
    { key: 'totalOrders', title: 'Total Orders', render: (row) => row.totalOrders },
  ]

  return (
    <div className="grid gap-6">
      <ReportsToolbar
        title="Employee Performance"
        description="Sales and order output by staff in the selected range."
        draftRange={draftRange}
        onRangeChange={setDraftRange}
        onApply={() => setAppliedRange(draftRange)}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat title="Total Staff" value={String(rows.length)} accent="primary" />
        <Stat title="Combined Sales" value={formatCurrency(totals.sales)} accent="secondary" />
        <Stat
          title="Top Performer"
          value={topPerformer ? topPerformer.name : '-'}
          accent="primary"
        />
      </section>

      <Card className="rounded-3xl border-slate-200/80 p-5">
        <h3 className="text-base font-semibold text-slate-900">Sales by Employee</h3>
        <p className="mt-1 text-sm text-slate-600">Top performers in the selected period</p>
        <div className="mt-4 h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={chartRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="totalSales" fill="#1e5bff" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="rounded-3xl border-slate-200/80 p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Detailed Performance</h3>
        <Table columns={columns} rows={rows} isLoading={staffQuery.isFetching} />
      </Card>
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

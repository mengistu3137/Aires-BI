import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../../../components/ui/card'
import { Table } from '../../../components/ui/table'
import { reportsService } from '../../../services/reports.service'
import { formatCurrency, formatDateTime } from '../../../utils/format'
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

const PIE_COLORS = ['#1e5bff', '#ff7f11', '#93b1ff']

export function PaymentReportPage() {
  const [draftRange, setDraftRange] = useState(initialRange)
  const [appliedRange, setAppliedRange] = useState(initialRange)

  const params = useMemo(
    () => ({
      startDate: appliedRange.startDate,
      endDate: appliedRange.endDate,
    }),
    [appliedRange],
  )

  const financeQuery = useQuery({
    queryKey: ['report-finance', params],
    queryFn: () => reportsService.finance(params),
  })

  const summary = financeQuery.data?.summary || {
    totalAmount: 0,
    transactions: 0,
    cash: 0,
    bank: 0,
    mobile: 0,
  }

  const rows = useMemo(() => financeQuery.data?.rows || [], [financeQuery.data])

  const pieData = [
    { name: 'Cash', value: summary.cash },
    { name: 'Bank', value: summary.bank },
    { name: 'Mobile', value: summary.mobile },
  ]

  const dailyRevenue = useMemo(() => {
    const buckets = new Map()

    rows.forEach((row) => {
      const key = row.createdAt?.slice(0, 10)
      if (!key) return
      buckets.set(key, (buckets.get(key) || 0) + (row.amount || 0))
    })

    return [...buckets.entries()]
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .map(([date, amount]) => ({ date, amount }))
  }, [rows])

  const columns = [
    { key: 'createdAt', title: 'Date', render: (row) => formatDateTime(row.createdAt) },
    { key: 'collector', title: 'Collector', render: (row) => row.collector?.name || '-' },
    {
      key: 'method',
      title: 'Method',
      render: (row) => (row.method === 'MOBILE_MONEY' ? 'MOBILE' : row.method),
    },
    { key: 'amount', title: 'Amount', render: (row) => formatCurrency(row.amount) },
    { key: 'branch', title: 'Branch', render: (row) => row.branch?.name || '-' },
  ]

  return (
    <div className="grid gap-6">
      <ReportsToolbar
        title="Payment Report"
        description="Payment channel analysis and transaction history overview."
        draftRange={draftRange}
        onRangeChange={setDraftRange}
        onApply={() => setAppliedRange(draftRange)}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total Revenue" value={formatCurrency(summary.totalAmount)} accent="primary" />
        <Stat title="Transactions" value={String(summary.transactions)} accent="secondary" />
        <Stat title="Cash + Bank" value={formatCurrency(summary.cash + summary.bank)} accent="primary" />
        <Stat title="Mobile" value={formatCurrency(summary.mobile)} accent="secondary" />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card className="rounded-3xl border-slate-200/80 p-5">
          <h3 className="text-base font-semibold text-slate-900">Payment Method Split</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-3xl border-slate-200/80 p-5">
          <h3 className="text-base font-semibold text-slate-900">Daily Payment Revenue</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#1e5bff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <Card className="rounded-3xl border-slate-200/80 p-5">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Payment Transactions</h3>
        <Table columns={columns} rows={rows} isLoading={financeQuery.isFetching} />
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

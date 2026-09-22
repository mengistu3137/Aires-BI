import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../../components/ui/card'
import { Table } from '../../../components/ui/table'
import { isPaymentsAccessAllowed } from '../../../lib/role-access'
import { paymentsService } from '../../../services/payments.service'
import { useAppStore } from '../../../store/app-store'
import { useAuthStore } from '../../../store/auth-store'
import { formatCurrency, formatDateTime } from '../../../utils/format'
import { PageContainer } from '../components/page-container'

const PERIODS = {
  TODAY: 'TODAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
}

function normalizePayments(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.payments)) return data.payments
  if (Array.isArray(data?.items)) return data.items
  return []
}

function getPeriodStart(period) {
  const now = new Date()

  if (period === PERIODS.TODAY) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  if (period === PERIODS.WEEK) {
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
  }

  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function isWithinPeriod(dateValue, period) {
  if (!dateValue) return false
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return false

  const start = getPeriodStart(period)
  return date >= start
}

function toMethodLabel(method) {
  if (method === 'MOBILE_MONEY') return 'Mobile'
  if (method === 'BANK_TRANSFER') return 'Bank'
  if (method === 'BANK') return 'Bank'
  if (method === 'CASH') return 'Cash'
  return method || '-'
}

export function ServerPaymentsPage() {
  const role = useAuthStore((state) => state.role)
  const branch = useAppStore((state) => state.branch)
  const canAccessPayments = isPaymentsAccessAllowed(role, branch)
  const [period, setPeriod] = useState(PERIODS.TODAY)

  const paymentsQuery = useQuery({
    queryKey: ['server-my-payments'],
    queryFn: () => paymentsService.listMine(),
    enabled: canAccessPayments,
  })

  const payments = useMemo(() => normalizePayments(paymentsQuery.data), [paymentsQuery.data])

  const filteredPayments = useMemo(() => {
    return payments
      .filter((payment) => isWithinPeriod(payment?.createdAt, period))
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
  }, [payments, period])

  const summary = useMemo(() => {
    return filteredPayments.reduce(
      (acc, payment) => {
        const amount = Number(payment?.amount) || 0
        const method = payment?.method

        acc.total += amount

        if (method === 'CASH') acc.cash += amount
        if (method === 'BANK' || method === 'BANK_TRANSFER') acc.bank += amount
        if (method === 'MOBILE_MONEY') acc.mobile += amount

        return acc
      },
      {
        total: 0,
        cash: 0,
        bank: 0,
        mobile: 0,
      },
    )
  }, [filteredPayments])

  const columns = [
    {
      key: 'orderId',
      title: 'Order ID',
      render: (row) => row.orderId || row.order?.id || '-',
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (row) => (
        <span className="font-semibold text-primary-700">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'method',
      title: 'Method',
      render: (row) => (
        <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
          {toMethodLabel(row.method)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Time',
      render: (row) => formatDateTime(row.createdAt),
    },
  ]

  return (
    <PageContainer
      title="My Payments"
      description="Review your payment collection and method breakdown."
      action={
        <div className="inline-flex rounded-xl border border-primary-100/70 bg-surface p-1">
          {[PERIODS.TODAY, PERIODS.WEEK, PERIODS.MONTH].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              disabled={!canAccessPayments}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                period === value
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-text-secondary hover:bg-primary-50/70'
              }`}
            >
              {value === PERIODS.TODAY ? 'Today' : value === PERIODS.WEEK ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      }
    >
      {!canAccessPayments ? (
        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">
            Payments are only available for CASHIER, or SERVER when the active branch is in quick
            mode.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total" value={formatCurrency(summary.total)} accent="primary" />
        <SummaryCard title="Cash" value={formatCurrency(summary.cash)} accent="secondary" />
        <SummaryCard title="Bank" value={formatCurrency(summary.bank)} accent="primary" />
        <SummaryCard title="Mobile" value={formatCurrency(summary.mobile)} accent="secondary" />
      </section>

      {paymentsQuery.isError ? (
        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">
            {paymentsQuery.error?.message || 'Failed to load payments'}
          </p>
        </Card>
      ) : null}

      <Card className="rounded-3xl">
        <h2 className="mb-4 text-base font-semibold text-text-primary">Payment Records</h2>
        <Table
          columns={columns}
          rows={canAccessPayments ? filteredPayments : []}
          isLoading={paymentsQuery.isLoading}
          loadingText="Loading payments..."
          emptyText={
            canAccessPayments
              ? 'No payments found for selected period'
              : 'You do not have permission to view payments in this mode'
          }
        />
      </Card>
    </PageContainer>
  )
}

function SummaryCard({ title, value, accent = 'primary' }) {
  return (
    <Card className="rounded-3xl">
      <p className="text-sm text-text-secondary">{title}</p>
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

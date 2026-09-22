import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../../components/ui/card'
import { paymentsService } from '../../../services/payments.service'
import { formatCurrency } from '../../../utils/format'
import { PaymentTable } from '../components/payment-table'
import { SummaryCard } from '../components/summary-card'

function isToday(value) {
  if (!value) return false
  const date = new Date(value)
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function CashierDashboardPage() {
  const paymentsQuery = useQuery({
    queryKey: ['cashier-dashboard-payments'],
    queryFn: () => paymentsService.listMine(),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  })

  const payments = useMemo(() => {
    const rows = paymentsQuery.data?.items || paymentsQuery.data || []
    if (!Array.isArray(rows)) return []
    return rows
  }, [paymentsQuery.data])

  const todayPayments = useMemo(
    () => payments.filter((payment) => isToday(payment?.createdAt)),
    [payments],
  )

  const summary = useMemo(() => {
    return todayPayments.reduce(
      (acc, payment) => {
        const amount = Number(payment?.amount) || 0
        acc.total += amount
        acc.count += 1
        if (payment?.method === 'CASH') acc.cash += amount
        if (payment?.method === 'BANK') acc.bank += amount
        if (payment?.method === 'MOBILE_MONEY') acc.mobile += amount
        return acc
      },
      { total: 0, cash: 0, bank: 0, mobile: 0, count: 0 },
    )
  }, [todayPayments])

  const recentRows = useMemo(
    () =>
      [...todayPayments]
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
        .slice(0, 5),
    [todayPayments],
  )

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Cashier Dashboard</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Today&apos;s payment performance and quick operational stats.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Today Total" value={formatCurrency(summary.total)} accent="primary" />
        <SummaryCard title="Transactions" value={String(summary.count)} accent="secondary" />
        <SummaryCard title="Cash" value={formatCurrency(summary.cash)} accent="primary" />
        <SummaryCard
          title="Bank + Mobile"
          value={formatCurrency(summary.bank + summary.mobile)}
          accent="secondary"
        />
      </section>

      <Card className="rounded-3xl">
        <h2 className="text-base font-semibold text-text-primary">Recent Payments</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Latest transactions from the active branch shift.
        </p>
        <div className="mt-4">
          <PaymentTable
            rows={recentRows}
            isLoading={paymentsQuery.isFetching}
            emptyText="No payments yet for today"
          />
        </div>
      </Card>
    </div>
  )
}

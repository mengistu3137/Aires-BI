import { useQuery } from '@tanstack/react-query'
import { Card } from '../../../components/ui/card'
import { paymentsService } from '../../../services/payments.service'
import { formatCurrency } from '../../../utils/format'
import { SummaryCard } from '../components/summary-card'

export function CashierDailySummaryPage() {
  const summaryQuery = useQuery({
    queryKey: ['cashier-daily-summary'],
    queryFn: () => paymentsService.summary(),
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
  })

  const data = summaryQuery.data || {}
  const totalToday = Number(data.totalAmount || data.totalToday || 0)
  const cashTotal = Number(data.cash || 0)
  const bankTotal = Number(data.bank || 0)
  const mobileTotal = Number(data.mobile || data.mobileMoney || 0)
  const transactions = Number(data.transactions || data.count || 0)
  const distributionTotal = cashTotal + bankTotal + mobileTotal

  return (
    <div className="grid gap-6">
      <header>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Daily Summary</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Clear snapshot of cashier collections for today.
          </p>
        </div>
      </header>

      {summaryQuery.isError ? (
        <p className="rounded-xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm text-secondary-700">
          {summaryQuery.error?.message || 'Unable to load daily summary'}
        </p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Today" value={formatCurrency(totalToday)} accent="primary" />
        <SummaryCard title="Cash Total" value={formatCurrency(cashTotal)} accent="secondary" />
        <SummaryCard title="Bank Total" value={formatCurrency(bankTotal)} accent="primary" />
        <SummaryCard
          title="Mobile Money Total"
          value={formatCurrency(mobileTotal)}
          accent="secondary"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <h2 className="text-base font-semibold text-text-primary">Transactions</h2>
          <p className="mt-2 text-4xl font-semibold text-primary-700">{transactions}</p>
          <p className="mt-1 text-sm text-text-secondary">Number of successful payment records.</p>
        </Card>

        <Card className="rounded-3xl">
          <h2 className="text-base font-semibold text-text-primary">Payment Distribution</h2>
          <p className="mt-1 text-sm text-text-secondary">Visual split by payment method.</p>

          <div className="mt-4 space-y-3">
            <DistributionRow
              label="Cash"
              value={cashTotal}
              total={distributionTotal}
              color="bg-primary-600"
            />
            <DistributionRow
              label="Bank"
              value={bankTotal}
              total={distributionTotal}
              color="bg-primary-400"
            />
            <DistributionRow
              label="Mobile"
              value={mobileTotal}
              total={distributionTotal}
              color="bg-secondary-500"
            />
          </div>
        </Card>
      </section>

      {summaryQuery.isFetching ? (
        <p className="text-sm text-text-secondary">Refreshing summary...</p>
      ) : null}
    </div>
  )
}

function DistributionRow({ label, value, total, color }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-text-secondary">{label}</span>
        <span className="text-text-secondary">{percent}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-primary-50">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-text-secondary">{formatCurrency(value)}</p>
    </div>
  )
}

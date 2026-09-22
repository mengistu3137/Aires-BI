import {
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { Card } from '../../../components/ui/card'
import { formatCurrency } from '../../../utils/format'
import { OfflineIndicator } from './offline-indicator'

export function SummaryBar({ summary, isOffline, isSyncing, queuedCount }) {
  const totalToday = Number(summary?.totalRevenue || summary?.totalAmount || 0)
  const ordersCount = Number(summary?.totalOrders || summary?.ordersCount || 0)
  const cashTotal = Number(summary?.paymentBreakdown?.cash || summary?.cash || 0)

  return (
    <Card className="rounded-[1.75rem] border-primary-100/70 bg-surface/90 px-4 py-4 shadow-soft-xl backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-3 lg:flex lg:flex-1">
          <SummaryTile
            icon={CurrencyDollarIcon}
            label="Today Total"
            value={formatCurrency(totalToday)}
            accentClass="bg-gradient-to-br from-primary-600 to-primary-400"
          />
          <SummaryTile
            icon={ClipboardDocumentListIcon}
            label="Orders Count"
            value={String(ordersCount)}
            accentClass="bg-gradient-to-br from-secondary-600 to-secondary-400"
          />
          <SummaryTile
            icon={BanknotesIcon}
            label="Cash Total"
            value={formatCurrency(cashTotal)}
            accentClass="bg-gradient-to-br from-primary-700 to-secondary-500"
          />
        </div>

        <OfflineIndicator isOffline={isOffline} isSyncing={isSyncing} queuedCount={queuedCount} />
      </div>
    </Card>
  )
}

function SummaryTile({ icon: Icon, label, value, accentClass }) {
  return (
    <div className="min-w-0 rounded-2xl border border-primary-100/70 bg-primary-50/40 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl text-white ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {label}
          </p>
          <p className="truncate text-lg font-bold text-text-primary">{value}</p>
        </div>
      </div>
    </div>
  )
}

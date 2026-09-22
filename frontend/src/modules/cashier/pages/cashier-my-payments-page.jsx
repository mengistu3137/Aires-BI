import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../../../components/ui/card'
import { paymentsService } from '../../../services/payments.service'
import { PaymentCard } from '../components/payment-card'
import { PaymentTable } from '../components/payment-table'
import { PaymentsFilters } from '../components/payments-filters'
import { ReceiptViewerModal } from '../components/receipt-viewer-modal'

function getDateRange(period, startDate, endDate) {
  const now = new Date()

  if (period === 'TODAY') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    }
  }

  if (period === 'WEEK') {
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() + mondayOffset)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    return {
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
    }
  }

  const customStart = startDate ? new Date(startDate) : null
  const customEnd = endDate ? new Date(endDate) : null

  if (customStart && !Number.isNaN(customStart.getTime())) {
    customStart.setHours(0, 0, 0, 0)
  }

  if (customEnd && !Number.isNaN(customEnd.getTime())) {
    customEnd.setHours(23, 59, 59, 999)
  }

  return {
    startDate: customStart ? customStart.toISOString() : undefined,
    endDate: customEnd ? customEnd.toISOString() : undefined,
  }
}

export function CashierMyPaymentsPage() {
  const [draftFilters, setDraftFilters] = useState({
    period: 'TODAY',
    method: 'ALL',
    startDate: '',
    endDate: '',
  })
  const [appliedFilters, setAppliedFilters] = useState({
    period: 'TODAY',
    method: 'ALL',
    startDate: '',
    endDate: '',
  })
  const [receiptPreview, setReceiptPreview] = useState(null)

  const queryParams = useMemo(() => {
    const { startDate, endDate } = getDateRange(
      appliedFilters.period,
      appliedFilters.startDate,
      appliedFilters.endDate,
    )

    return {
      ...(appliedFilters.method !== 'ALL' ? { method: appliedFilters.method } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }
  }, [appliedFilters])

  const paymentsQuery = useQuery({
    queryKey: ['cashier-my-payments', queryParams],
    queryFn: () => paymentsService.listMine(queryParams),
  })

  const payments = useMemo(() => {
    const rows = paymentsQuery.data?.items || paymentsQuery.data || []
    if (!Array.isArray(rows)) return []
    return rows.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
  }, [paymentsQuery.data])

  const onDraftChange = (next) => {
    setDraftFilters((previous) => ({
      ...previous,
      ...next,
    }))
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">My Payments</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Review your recent transactions with quick filtering.
        </p>
      </header>

      <Card className="rounded-3xl">
        <PaymentsFilters
          draftFilters={draftFilters}
          onDraftChange={onDraftChange}
          onApply={() => setAppliedFilters(draftFilters)}
          isApplying={paymentsQuery.isFetching}
        />

        <div className="mt-4 hidden md:block">
          <PaymentTable
            rows={payments}
            isLoading={paymentsQuery.isFetching}
            onViewReceipt={(payment) => setReceiptPreview(payment)}
          />
        </div>

        <div className="grid gap-3 md:hidden">
          {payments.map((payment) => (
            <PaymentCard key={payment.id} payment={payment} />
          ))}
          {!paymentsQuery.isFetching && !payments.length ? (
            <Card className="rounded-2xl p-4 text-sm text-text-secondary">No payments found</Card>
          ) : null}
        </div>
      </Card>

      <ReceiptViewerModal
        isOpen={Boolean(receiptPreview)}
        imageUrl={receiptPreview?.imageUrl}
        title="Receipt Image"
        enableDownload
        onClose={() => setReceiptPreview(null)}
      />
    </div>
  )
}

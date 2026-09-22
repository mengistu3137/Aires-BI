import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Skeleton } from '../../../components/ui/skeleton'
import { Table } from '../../../components/ui/table'
import { paymentsService } from '../../../services/payments.service'
import { useBranchFilterStore } from '../../../store/branch-filter-store'
import { formatCurrency, formatDateTime } from '../../../utils/format'
import { ReceiptViewerModal } from '../../cashier/components/receipt-viewer-modal'
import { useManagerStore } from '../manager.store'

const METHOD_OPTIONS = [
  { label: 'All Methods', value: 'ALL' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank', value: 'BANK' },
  { label: 'Mobile Money', value: 'MOBILE_MONEY' },
]

function normalizeRows(data) {
  const rows = data?.items || data?.rows || data || []
  return Array.isArray(rows) ? rows : []
}

function orderIdLabel(row) {
  const orderId = row?.order?.id || row?.orderId
  return orderId ? `#${String(orderId).slice(-6).toUpperCase()}` : '-'
}

function detectSuspicion(rows) {
  const byCollector = new Map()

  rows.forEach((row) => {
    const collectorId = row?.collector?.id || row?.collectorId || row?.collector?.name || 'unknown'
    const key = String(collectorId)

    if (!byCollector.has(key)) byCollector.set(key, [])
    byCollector.get(key).push(row)
  })

  const suspiciousIds = new Set()

  byCollector.forEach((list) => {
    const sorted = [...list].sort(
      (a, b) => new Date(a?.createdAt || 0).getTime() - new Date(b?.createdAt || 0).getTime(),
    )

    sorted.forEach((row, index) => {
      const amount = Number(row?.amount) || 0
      if (amount >= 10000) {
        suspiciousIds.add(row.id)
      }

      if (index === 0) return

      const previous = sorted[index - 1]
      const prevAmount = Number(previous?.amount) || 0
      const sameAmount = Math.abs(prevAmount - amount) < 0.001
      const sameMethod = previous?.method === row?.method
      const minutesBetween =
        (new Date(row?.createdAt || 0).getTime() - new Date(previous?.createdAt || 0).getTime()) /
        60_000

      if (sameAmount && sameMethod && minutesBetween >= 0 && minutesBetween <= 5) {
        suspiciousIds.add(row.id)
        suspiciousIds.add(previous.id)
      }
    })
  })

  return suspiciousIds
}

export function ManagerPaymentsPage() {
  const selectedBranchId = useBranchFilterStore((state) => state.selectedBranchId)
  const dateRange = useManagerStore((state) => state.dateRange)
  const [receiptPreview, setReceiptPreview] = useState(null)

  const [draftFilters, setDraftFilters] = useState({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    method: 'ALL',
    staff: '',
  })
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    method: 'ALL',
    staff: '',
  })

  useEffect(() => {
    setDraftFilters((previous) => ({
      ...previous,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }))
    setAppliedFilters((previous) => ({
      ...previous,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }))
  }, [dateRange.startDate, dateRange.endDate])

  const params = useMemo(
    () => ({
      ...(selectedBranchId !== 'ALL' ? { branchId: selectedBranchId } : {}),
      ...(appliedFilters.startDate ? { startDate: appliedFilters.startDate } : {}),
      ...(appliedFilters.endDate ? { endDate: appliedFilters.endDate } : {}),
      ...(appliedFilters.method !== 'ALL' ? { method: appliedFilters.method } : {}),
    }),
    [selectedBranchId, appliedFilters],
  )

  const paymentsQuery = useQuery({
    queryKey: [
      'manager-payments-audit',
      selectedBranchId,
      appliedFilters.startDate,
      appliedFilters.endDate,
      appliedFilters.method,
    ],
    queryFn: () => paymentsService.audit(params),
    staleTime: 30_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  })

  const allRows = useMemo(() => normalizeRows(paymentsQuery.data), [paymentsQuery.data])

  const rows = useMemo(() => {
    const staffNeedle = appliedFilters.staff.trim().toLowerCase()
    if (!staffNeedle) return allRows

    return allRows.filter((row) => {
      const collectorName = String(row?.collector?.name || row?.collectorName || '').toLowerCase()
      return collectorName.includes(staffNeedle)
    })
  }, [allRows, appliedFilters.staff])

  const suspiciousIds = useMemo(() => detectSuspicion(rows), [rows])

  const suspiciousCount = suspiciousIds.size
  const totalAmount = rows.reduce((sum, row) => sum + (Number(row?.amount) || 0), 0)

  const columns = [
    {
      key: 'order',
      title: 'Order ID',
      render: (row) => orderIdLabel(row),
    },
    { key: 'amount', title: 'Amount', render: (row) => formatCurrency(row.amount) },
    {
      key: 'method',
      title: 'Method',
      render: (row) => (row.method === 'MOBILE_MONEY' ? 'MOBILE' : row.method),
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => row.status || row.paymentStatus || 'PAID',
    },
    {
      key: 'collector',
      title: 'Collected By',
      render: (row) => row.collector?.name || row.collectorName || '-',
    },
    {
      key: 'createdAt',
      title: 'Time',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'receipt',
      title: 'Receipt',
      render: (row) =>
        row.imageUrl ? (
          <button
            type="button"
            className="text-sm font-medium text-primary-700 hover:text-primary-800"
            onClick={() => setReceiptPreview(row)}
          >
            View
          </button>
        ) : (
          '-'
        ),
    },
    {
      key: 'auditFlag',
      title: 'Audit Flag',
      render: (row) =>
        suspiciousIds.has(row.id) ? (
          <span className="inline-flex rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary-700">
            Suspicious
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
            Normal
          </span>
        ),
    },
  ]

  if (paymentsQuery.isLoading) {
    return <ManagerPaymentsSkeleton />
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Payment Audit</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Audit-ready transaction stream with receipts and anomaly hints.
        </p>
      </header>

      <Card className="rounded-3xl">
        <div className="grid gap-3 lg:grid-cols-4">
          <Input
            label="Start Date"
            type="date"
            value={draftFilters.startDate}
            onChange={(event) =>
              setDraftFilters((previous) => ({
                ...previous,
                startDate: event.target.value,
              }))
            }
          />

          <Input
            label="End Date"
            type="date"
            value={draftFilters.endDate}
            onChange={(event) =>
              setDraftFilters((previous) => ({
                ...previous,
                endDate: event.target.value,
              }))
            }
          />

          <Select
            label="Payment Method"
            value={draftFilters.method}
            options={METHOD_OPTIONS}
            onChange={(event) =>
              setDraftFilters((previous) => ({
                ...previous,
                method: event.target.value,
              }))
            }
          />

          <Input
            label="Staff"
            placeholder="Search collector"
            value={draftFilters.staff}
            onChange={(event) =>
              setDraftFilters((previous) => ({
                ...previous,
                staff: event.target.value,
              }))
            }
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-text-secondary">
            {rows.length} transactions • {formatCurrency(totalAmount)} • {suspiciousCount} flagged
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAppliedFilters(draftFilters)}
          >
            Apply Filters
          </Button>
        </div>
      </Card>

      {paymentsQuery.isError ? (
        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">
            {paymentsQuery.error?.message || 'Failed to load payment audit data'}
          </p>
          <div className="mt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => paymentsQuery.refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="rounded-3xl">
        <Table
          columns={columns}
          rows={rows}
          isLoading={paymentsQuery.isFetching}
          loadingText="Loading payments..."
          emptyText="No payments for selected filters"
        />
      </Card>

      <ReceiptViewerModal
        isOpen={Boolean(receiptPreview)}
        imageUrl={receiptPreview?.imageUrl}
        title="Audit Receipt"
        enableDownload
        onClose={() => setReceiptPreview(null)}
      />
    </div>
  )
}

function ManagerPaymentsSkeleton() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Payment Audit</h1>
        <p className="mt-1 text-sm text-text-secondary">Loading audit records...</p>
      </header>

      <Skeleton className="h-44" />
      <Skeleton className="h-96" />
    </div>
  )
}

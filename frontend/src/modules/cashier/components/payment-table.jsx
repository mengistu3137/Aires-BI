import { Table } from '../../../components/ui/table'
import { Badge } from '../../../components/ui/badge'
import { formatCurrency, formatDateTime } from '../../../utils/format'

export function PaymentTable({
  rows = [],
  isLoading = false,
  emptyText = 'No payments found',
  onViewReceipt,
}) {
  const columns = [
    {
      key: 'order',
      title: 'Order ID',
      render: (row) => {
        const orderId = row.order?.id || row.orderId
        return orderId ? `#${String(orderId).slice(-6).toUpperCase()}` : '-'
      },
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
      render: (row) => (row.method === 'MOBILE_MONEY' ? 'MOBILE' : row.method),
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <Badge value={row.status || 'PAID'} />,
    },
    {
      key: 'createdAt',
      title: 'Time',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'receipt',
      title: 'Receipt',
      render: (row) => {
        if (!row.imageUrl) return '-'

        return (
          <button
            type="button"
            className="text-sm font-medium text-secondary-600 hover:text-secondary-700"
            onClick={() => onViewReceipt?.(row)}
          >
            View
          </button>
        )
      },
    },
  ]

  return (
    <Table
      columns={columns}
      rows={rows}
      isLoading={isLoading}
      loadingText="Loading payments..."
      emptyText={emptyText}
    />
  )
}

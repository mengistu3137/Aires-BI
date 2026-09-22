import { useMemo, useState } from 'react'
import { cn } from '../../../utils/cn'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { formatCurrency, formatDateTime } from '../../../utils/format'

function getOrderTotal(order) {
  if (typeof order?.totalAmount === 'number') return order.totalAmount
  if (typeof order?.total === 'number') return order.total
  return 0
}

function getOrderItems(order) {
  if (!Array.isArray(order?.items)) return []

  return order.items.map((item) => ({
    id: item.id || `${item.productId || 'item'}-${item.quantity || 1}`,
    name: item?.product?.name || item?.name || item?.itemName || 'Item',
    quantity: Number(item?.quantity) || 1,
  }))
}

export function OrderCard({ order, isDelivering, onDeliver, highlightReady = false }) {
  const [showDetails, setShowDetails] = useState(false)

  const items = useMemo(() => getOrderItems(order), [order])

  const canDeliver = order?.status === 'READY'

  return (
    <Card
      className={cn(
        'rounded-3xl border-slate-200/80 p-5',
        highlightReady && canDeliver && 'border-secondary-300 bg-secondary-50/45',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Order ID</p>
          <h3 className="text-base font-semibold text-slate-900">{order?.id}</h3>
        </div>
        <Badge value={order?.status || 'PENDING'} />
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
        <p>
          <span className="font-semibold text-slate-900">Total:</span>{' '}
          {formatCurrency(getOrderTotal(order))}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Time:</span>{' '}
          {formatDateTime(order?.createdAt)}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Table:</span> {order?.tableNo || '-'}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Customer:</span>{' '}
          {order?.customerName || '-'}
        </p>
      </div>

      <div className="mt-3">
        <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Items</p>
        <ul className="space-y-1">
          {items.slice(0, 2).map((item) => (
            <li key={item.id} className="text-sm text-slate-700">
              {item.name} x {item.quantity}
            </li>
          ))}
          {!items.length ? <li className="text-sm text-slate-500">No items found</li> : null}
        </ul>
      </div>

      {showDetails && items.length > 2 ? (
        <div className="mt-3 border-t border-slate-200 pt-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Full Item List</p>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={`full-${item.id}`} className="text-sm text-slate-700">
                {item.name} x {item.quantity}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setShowDetails((value) => !value)}>
          {showDetails ? 'Hide details' : 'View details'}
        </Button>

        {canDeliver ? (
          <Button
            size="sm"
            variant="secondary"
            isLoading={isDelivering}
            onClick={() => onDeliver(order.id)}
          >
            Mark as delivered
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

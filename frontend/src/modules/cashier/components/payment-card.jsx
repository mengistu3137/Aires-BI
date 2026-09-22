import { Badge } from '../../../components/ui/badge'
import { Card } from '../../../components/ui/card'
import { formatCurrency, formatDateTime } from '../../../utils/format'

function getOrderId(payment) {
  return payment?.order?.id || payment?.orderId || ''
}

export function PaymentCard({ payment }) {
  const orderId = getOrderId(payment)

  return (
    <Card className="rounded-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Payment</p>
          <p className="mt-1 text-base font-semibold text-text-primary">
            {formatCurrency(payment?.amount)}
          </p>
        </div>
        <Badge value={payment?.method === 'MOBILE_MONEY' ? 'MOBILE' : payment?.method} />
      </div>

      <div className="mt-3 grid gap-1 text-sm text-text-secondary">
        <p>
          <span className="font-medium text-text-primary">Status:</span> {payment?.status || 'PAID'}
        </p>
        <p>
          <span className="font-medium text-text-primary">Date:</span>{' '}
          {formatDateTime(payment?.createdAt)}
        </p>
        <p>
          <span className="font-medium text-text-primary">Order:</span>{' '}
          {orderId ? `#${String(orderId).slice(-6).toUpperCase()}` : '-'}
        </p>
        <p>
          <span className="font-medium text-text-primary">Reference:</span>{' '}
          {payment?.reference || '-'}
        </p>
        {payment?.imageUrl ? (
          <p>
            <a
              href={payment.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-secondary-600 hover:text-secondary-700"
            >
              View receipt
            </a>
          </p>
        ) : null}
      </div>
    </Card>
  )
}

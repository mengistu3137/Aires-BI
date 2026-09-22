import { MinusIcon, PlusIcon, TrashIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import { Card } from '../../../components/ui/card'
import { formatCurrency } from '../../../utils/format'
import { PaymentButtons } from './payment-buttons'

export function CartPanel({
  items,
  totalAmount,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onPay,
  isSubmitting,
}) {
  return (
    <Card className="flex h-full flex-col rounded-[1.75rem] border-primary-100/70 bg-surface/95 p-4 shadow-soft-xl">
      <div className="flex items-center justify-between gap-3 border-b border-primary-100/70 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Cart</p>
          <h2 className="text-xl font-bold text-text-primary">Selected items</h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-primary-100/70 px-3 text-sm font-semibold text-text-secondary transition active:scale-[0.98]"
        >
          <TrashIcon className="h-4 w-4" />
          Clear
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="grid h-full place-items-center rounded-3xl border border-dashed border-primary-100/70 bg-primary-50/40 px-4 py-10 text-center">
            <div>
              <ShoppingCartIcon className="mx-auto h-10 w-10 text-primary-200" />
              <p className="mt-3 text-sm font-semibold text-text-primary">Cart is empty</p>
              <p className="mt-1 text-xs text-text-secondary">Tap products to start a sale.</p>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.productId}
              className="rounded-3xl border border-primary-100/70 bg-primary-50/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-secondary">{formatCurrency(item.price)} each</p>
                </div>
                <p className="text-sm font-bold text-primary-700">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-full border border-primary-100/70 bg-surface p-1 shadow-sm">
                  <QtyButton icon={MinusIcon} onClick={() => onDecrement(item.productId)} />
                  <span className="min-w-10 px-3 text-center text-sm font-bold text-text-primary">
                    {item.quantity}
                  </span>
                  <QtyButton icon={PlusIcon} onClick={() => onIncrement(item.productId)} />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.productId)}
                  className="rounded-full px-3 py-2 text-xs font-semibold text-secondary-700 transition active:scale-[0.98]"
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 space-y-4 border-t border-primary-100/70 pt-4">
        <div className="flex items-center justify-between rounded-3xl bg-primary-700 px-4 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Total amount</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
            {items.length} item{items.length === 1 ? '' : 's'}
          </p>
        </div>

        <PaymentButtons onPay={onPay} onCancel={onClear} isLoading={isSubmitting} />
      </div>
    </Card>
  )
}

function QtyButton({ icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full text-text-secondary transition active:scale-[0.95] active:bg-primary-50"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

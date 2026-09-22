import { TrashIcon } from '@heroicons/react/24/outline'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { formatCurrency } from '../../../utils/format'

const ORDER_TYPES = [
  { label: 'Dine In', value: 'DINE_IN' },
  { label: 'Takeaway', value: 'TAKEAWAY' },
  { label: 'Delivery', value: 'DELIVERY' },
]

export function CartSidebar({
  items,
  total,
  orderType,
  tableNo,
  customerName,
  isSubmitting,
  submitError,
  onOrderTypeChange,
  onTableNoChange,
  onCustomerNameChange,
  onQuantityChange,
  onRemove,
  onClear,
  onSubmit,
}) {
  return (
    <div className="sticky bottom-2 z-10 lg:sticky lg:top-20 lg:bottom-auto">
      <Card className="rounded-3xl border-slate-200/80 p-5 shadow-soft-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Cart</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!items.length || isSubmitting}
          >
            Clear
          </Button>
        </div>

        <div className="grid max-h-72 gap-3 overflow-y-auto pr-1">
          {items.length ? (
            items.map((item) => (
              <div
                key={item.productId}
                className="grid gap-2 rounded-2xl border border-slate-200 p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{formatCurrency(item.price)}</p>
                </div>

                <Input
                  className="w-24"
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => onQuantityChange(item.productId, event.target.value)}
                />

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onRemove(item.productId)}
                >
                  <TrashIcon className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
              No items in cart yet.
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">Total</p>
          <p className="text-2xl font-semibold text-primary-700">{formatCurrency(total)}</p>
        </div>

        <form
          className="mt-4 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <Select
            label="Order Type"
            value={orderType}
            options={ORDER_TYPES}
            onChange={onOrderTypeChange}
          />
          <Input
            label="Table Number (Optional)"
            placeholder="T-01"
            value={tableNo}
            onChange={onTableNoChange}
          />
          <Input
            label="Customer Name (Optional)"
            placeholder="Customer"
            value={customerName}
            onChange={onCustomerNameChange}
          />

          {submitError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" isLoading={isSubmitting} disabled={!items.length}>
            Submit Order
          </Button>
        </form>
      </Card>
    </div>
  )
}

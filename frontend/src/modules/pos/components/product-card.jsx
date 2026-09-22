import { memo } from 'react'
import { cn } from '../../../utils/cn'
import { formatCurrency } from '../../../utils/format'

export const ProductCard = memo(function ProductCard({ product, quantity = 0, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className={cn(
        'group relative flex min-h-28 flex-col justify-between rounded-3xl border border-primary-100/70 bg-surface p-4 text-left shadow-soft transition active:scale-[0.98] active:bg-primary-50',
        quantity > 0 && 'border-primary-300 ring-2 ring-primary-100',
      )}
    >
      {quantity > 0 && (
        <span className="absolute right-3 top-3 rounded-full bg-primary-600 px-2.5 py-1 text-xs font-bold text-white shadow-soft">
          {quantity}
        </span>
      )}

      <div className="space-y-2 pr-10">
        <p className="line-clamp-2 text-[0.95rem] font-semibold leading-tight text-text-primary">
          {product.name}
        </p>
        <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">
          {product.category?.name || 'Uncategorized'}
        </p>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-lg font-bold text-primary-700">{formatCurrency(product.price)}</p>
        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-text-secondary">
          Tap to add
        </span>
      </div>
    </button>
  )
})

import { PlusIcon } from '@heroicons/react/24/outline'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { formatCurrency } from '../../../utils/format'

export function ProductCard({ product, onAdd }) {
  return (
    <Card className="rounded-2xl border-slate-200/80 p-4">
      <div className="flex h-full flex-col gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {product?.category?.name || 'General'}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900">{product?.name}</h3>
          <p className="mt-2 text-lg font-semibold text-primary-700">
            {formatCurrency(product?.price || 0)}
          </p>
        </div>

        <Button className="mt-auto gap-1.5" variant="secondary" onClick={() => onAdd(product)}>
          <PlusIcon className="h-4 w-4" />
          Add
        </Button>
      </div>
    </Card>
  )
}

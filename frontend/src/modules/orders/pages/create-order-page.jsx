import { useMemo } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PageHeader } from '../../../components/shared/page-header'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { useAuthStore } from '../../../store/auth-store'
import { productsService } from '../../../services/products.service'
import { ordersService } from '../../../services/orders.service'
import { USER_ROLES } from '../../../types/status'
import { formatCurrency } from '../../../utils/format'

const schema = z.object({
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  tableNo: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  customerPhone: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Select a product'),
        quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
      }),
    )
    .min(1, 'At least one item is required'),
})

export function CreateOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useAuthStore((state) => state.role)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'DINE_IN',
      tableNo: '',
      customerName: '',
      customerPhone: '',
      items: [{ productId: '', quantity: 1 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedItems = useWatch({
    control,
    name: 'items',
  })

  const { data: products = [], isFetching: isProductsLoading } = useQuery({
    queryKey: ['products', { isActive: true }],
    queryFn: () => productsService.list({ isActive: true }),
  })

  const createOrder = useMutation({
    mutationFn: ordersService.create,
    onSuccess: () => {
      toast.success('Order created successfully')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      navigate('/orders')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create order')
    },
  })

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  const orderTotal = useMemo(
    () =>
      watchedItems.reduce((sum, item) => {
        const product = productMap.get(item.productId)
        if (!product) return sum
        return sum + product.price * Number(item.quantity || 0)
      }, 0),
    [productMap, watchedItems],
  )

  if (role !== USER_ROLES.SERVER) {
    return (
      <div className="grid gap-6">
        <PageHeader
          title="Create Order"
          description="Only users with SERVER role can create orders."
        />
        <Card className="rounded-3xl">
          <p className="text-sm text-text-secondary">
            You do not have permission to create an order with your current role.
          </p>
          <div className="mt-4">
            <Link to="/orders">
              <Button variant="ghost">Back to Orders</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const productOptions = [{ label: 'Select product', value: '' }].concat(
    products.map((product) => ({
      label: `${product.name} - ${formatCurrency(product.price)}`,
      value: product.id,
    })),
  )

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Create Order"
        description="Add one or more items and submit the order to begin the kitchen workflow."
      />

      <form className="grid gap-5" onSubmit={handleSubmit((values) => createOrder.mutate(values))}>
        <Card className="grid gap-4 rounded-3xl sm:grid-cols-2">
          <Select
            label="Order Type"
            options={[
              { label: 'Dine In', value: 'DINE_IN' },
              { label: 'Takeaway', value: 'TAKEAWAY' },
              { label: 'Delivery', value: 'DELIVERY' },
            ]}
            error={errors.type?.message}
            {...register('type')}
          />

          <Input
            label="Table Number"
            placeholder="Optional"
            error={errors.tableNo?.message}
            {...register('tableNo')}
          />

          <Input
            label="Customer Name"
            placeholder="Optional"
            error={errors.customerName?.message}
            {...register('customerName')}
          />

          <Input
            label="Customer Phone"
            placeholder="Optional"
            error={errors.customerPhone?.message}
            {...register('customerPhone')}
          />
        </Card>

        <Card className="rounded-3xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-primary">Order Items</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => append({ productId: '', quantity: 1 })}
            >
              <PlusIcon className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="grid gap-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-3 rounded-2xl border border-primary-100/70 p-4 sm:grid-cols-[1fr_130px_auto]"
              >
                <Select
                  label={`Product ${index + 1}`}
                  options={productOptions}
                  error={errors.items?.[index]?.productId?.message}
                  {...register(`items.${index}.productId`)}
                />

                <Input
                  label="Qty"
                  type="number"
                  min="1"
                  error={errors.items?.[index]?.quantity?.message}
                  {...register(`items.${index}.quantity`)}
                />

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="gap-1"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {errors.items?.message ? (
            <p className="mt-3 text-sm text-secondary-700">{errors.items.message}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary-50 px-4 py-3">
            <p className="text-sm font-medium text-text-secondary">
              {isProductsLoading ? 'Loading product prices...' : 'Calculated Total'}
            </p>
            <p className="text-2xl font-semibold text-primary-700">{formatCurrency(orderTotal)}</p>
          </div>
        </Card>

        <div className="flex flex-wrap justify-end gap-3">
          <Link to="/orders">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={createOrder.isPending}>
            Submit Order
          </Button>
        </div>
      </form>
    </div>
  )
}

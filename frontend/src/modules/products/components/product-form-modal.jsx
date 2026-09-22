import { useEffect } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'

const schema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  sku: z.string().trim().optional(),
  type: z.string().trim().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  isActive: z.boolean(),
})

export function ProductFormModal({
  isOpen,
  mode,
  product,
  categories,
  isLoading,
  submitError,
  onClose,
  onSubmit,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      price: '',
      sku: '',
      type: '',
      categoryId: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (!isOpen) {
      return
    }

    reset({
      name: product?.name || '',
      price: product?.price ?? '',
      sku: product?.sku || '',
      type: product?.type || '',
      categoryId: product?.categoryId || '',
      isActive: product?.isActive ?? true,
    })
  }, [isOpen, product, reset])

  const categoryOptions = categories.map((category) => ({
    label: category.name,
    value: category.id,
  }))

  const isEdit = mode === 'edit'

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-text-primary/30" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="glass-panel w-full max-w-lg p-6 shadow-soft-xl sm:p-8">
          <DialogTitle className="text-xl font-semibold text-text-primary">
            {isEdit ? 'Edit Product' : 'Create Product'}
          </DialogTitle>
          <p className="mt-1 text-sm text-text-secondary">
            {isEdit
              ? 'Update product details, availability, and category assignment.'
              : 'Add a new product to your catalog with pricing and category details.'}
          </p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit((values) => onSubmit(values))}>
            <Input label="Product Name" error={errors.name?.message} {...register('name')} />

            <Input
              label="Price"
              type="number"
              step="0.01"
              min="0"
              error={errors.price?.message}
              {...register('price')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
              <Input label="Type" placeholder="FOOD, DRINK..." {...register('type')} />
            </div>

            <Select
              label="Category"
              options={categoryOptions}
              error={errors.categoryId?.message}
              {...register('categoryId')}
            />

            {isEdit ? (
              <Select
                label="Status"
                options={[
                  { label: 'Active', value: 'true' },
                  { label: 'Inactive', value: 'false' },
                ]}
                {...register('isActive', {
                  setValueAs: (value) => value === 'true',
                })}
              />
            ) : null}

            {submitError ? (
              <p className="rounded-xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm text-secondary-700">
                {submitError}
              </p>
            ) : null}

            <div className="mt-2 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isLoading}>
                {isEdit ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

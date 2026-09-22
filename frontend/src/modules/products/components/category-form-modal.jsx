import { useEffect } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'

const schema = z.object({
  name: z.string().trim().min(2, 'Category name must be at least 2 characters'),
  isActive: z.boolean(),
})

export function CategoryFormModal({
  isOpen,
  mode,
  category,
  isLoading,
  submitError,
  onClose,
  onSubmit,
}) {
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (!isOpen) return

    reset({
      name: category?.name || '',
      isActive: category?.isActive ?? true,
    })
  }, [isOpen, category, reset])

  const isEdit = mode === 'edit'

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-text-primary/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="glass-panel w-full max-w-lg p-6 shadow-soft-xl sm:p-8">
          <DialogTitle className="text-xl font-semibold text-text-primary">
            {isEdit ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <p className="mt-1 text-sm text-text-secondary">
            {isEdit
              ? 'Update category details and activation status.'
              : 'Add a category for product classification and reporting.'}
          </p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit((values) => onSubmit(values))}>
            <Input label="Category Name" error={errors.name?.message} {...register('name')} />

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
                {isEdit ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

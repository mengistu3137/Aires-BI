import { useEffect } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'SERVER', 'CHEF']),
  branchId: z.string().min(1, 'Branch is required'),
  isActive: z.boolean(),
})

const editSchema = createSchema.extend({
  password: z.string().optional(),
})

const ROLE_OPTIONS = [
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'MANAGER', value: 'MANAGER' },
  { label: 'CASHIER', value: 'CASHIER' },
  { label: 'SERVER', value: 'SERVER' },
  { label: 'CHEF', value: 'CHEF' },
]

export function UserForm({
  isOpen,
  mode,
  user,
  branches,
  currentRole,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}) {
  const isCreate = mode === 'create'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isCreate ? createSchema : editSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'CASHIER',
      branchId: '',
      isActive: true,
    },
  })

  useEffect(() => {
    if (!isOpen) return

    reset({
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'CASHIER',
      branchId: user?.branchId || branches?.[0]?.id || '',
      isActive: user?.isActive ?? true,
    })
  }, [isOpen, user, reset, branches])

  const availableRoleOptions =
    currentRole === 'MANAGER'
      ? ROLE_OPTIONS.filter((role) => role.value !== 'ADMIN' && role.value !== 'MANAGER')
      : ROLE_OPTIONS

  const branchOptions = branches.map((branch) => ({
    label: branch.name,
    value: branch.id,
  }))

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-text-primary/30" />
      <div className="fixed inset-0 p-0 sm:p-4">
        <div className="flex h-full items-center justify-center">
          <DialogPanel className="glass-panel h-full w-full overflow-y-auto p-5 shadow-soft-xl sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl sm:p-7">
            <DialogTitle className="text-xl font-semibold text-text-primary">
              {isCreate ? 'Add User' : 'Edit User'}
            </DialogTitle>
            <p className="mt-1 text-sm text-text-secondary">
              {isCreate
                ? 'Create a new organization user and assign role access.'
                : 'Update user details, role, and active status.'}
            </p>

            <form className="mt-6 grid gap-4" onSubmit={handleSubmit((values) => onSubmit(values))}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Name" error={errors.name?.message} {...register('name')} />
                <Input
                  label="Email"
                  type="email"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Role"
                  options={availableRoleOptions}
                  error={errors.role?.message}
                  {...register('role')}
                />
                <Select
                  label="Branch"
                  options={branchOptions}
                  error={errors.branchId?.message}
                  {...register('branchId')}
                />
              </div>

              {isCreate ? (
                <Input
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  error={errors.password?.message}
                  {...register('password')}
                />
              ) : null}

              <label className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-primary-200 text-primary-600 focus:ring-primary-500"
                  {...register('isActive')}
                />
                Active user
              </label>

              {submitError ? (
                <p className="rounded-xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm text-secondary-700">
                  {submitError}
                </p>
              ) : null}

              <div className="mt-2 grid gap-2 sm:flex sm:justify-end">
                <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  {isCreate ? 'Create User' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { ConfirmationModal } from '../../../components/ui/modal'
import { Select } from '../../../components/ui/select'
import { superAdminService } from '../../../services/super-admin.service'

const ROLE_OPTIONS = [
  { label: 'SUPER_ADMIN', value: 'SUPER_ADMIN' },
  { label: 'ADMIN', value: 'ADMIN' },
]

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function SuperAdminUsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    role: 'ADMIN',
  })
  const [statusTarget, setStatusTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const usersQuery = useQuery({
    queryKey: ['super-admin-users', search],
    queryFn: () => superAdminService.users({ search }),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  })

  const createMutation = useMutation({
    mutationFn: (payload) => superAdminService.createUser(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] })
      setFormValues({ name: '', email: '', role: 'ADMIN' })
      toast.success(
        `User created. Temporary password: ${created?.temporaryPassword || 'generated on server'}`,
      )
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create user')
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }) => superAdminService.setUserStatus(userId, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] })
      setStatusTarget(null)
      toast.success(variables.isActive ? 'User activated' : 'User deactivated')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update user status')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (userId) => superAdminService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-users'] })
      setDeleteTarget(null)
      toast.success('User deleted')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete user')
    },
  })

  const users = usersQuery.data || []

  const rows = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      })),
    [users],
  )

  const onSubmit = (event) => {
    event.preventDefault()
    if (!formValues.name || !formValues.email || !formValues.role) {
      toast.error('Please fill all required fields')
      return
    }

    createMutation.mutate({
      name: formValues.name,
      email: formValues.email,
      role: formValues.role,
    })
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Users</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage platform admins and support-level users.
        </p>
      </header>

      <Card className="rounded-3xl border-primary-100/70 p-6">
        <h2 className="text-base font-semibold text-text-primary">Create User</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={onSubmit}>
          <Input
            label="Name"
            value={formValues.name}
            onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Full name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formValues.email}
            onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="email@example.com"
            required
          />
          <Select
            label="Role"
            value={formValues.role}
            options={ROLE_OPTIONS}
            onChange={(event) => setFormValues((prev) => ({ ...prev, role: event.target.value }))}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full" isLoading={createMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Card>

      <Card className="rounded-3xl border-primary-100/70 p-4">
        <Input
          label="Search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name"
        />
      </Card>

      <Card className="overflow-hidden rounded-3xl p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary-100/70 text-sm">
            <thead className="bg-primary-50/50 text-left text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100/70 bg-surface">
              {rows.map((user) => (
                <tr key={user.id} className="hover:bg-primary-50/60">
                  <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
                  <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3 text-text-secondary">{user.role}</td>
                  <td className="px-4 py-3">
                    <Badge value={user.status} />
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={user.isActive ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => setStatusTarget(user)}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(user)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-secondary">
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmationModal
        isOpen={Boolean(statusTarget)}
        title={`${statusTarget?.isActive ? 'Deactivate' : 'Activate'} User`}
        description={`Are you sure you want to ${statusTarget?.isActive ? 'deactivate' : 'activate'} ${statusTarget?.name || 'this user'}?`}
        confirmText={statusTarget?.isActive ? 'Deactivate' : 'Activate'}
        isLoading={statusMutation.isPending}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => {
          if (!statusTarget?.id) return
          statusMutation.mutate({
            userId: statusTarget.id,
            isActive: !statusTarget.isActive,
          })
        }}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Delete User"
        description={`This will soft delete ${deleteTarget?.name || 'this user'} and deactivate access.`}
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget?.id) return
          deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}

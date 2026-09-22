import { useEffect, useMemo, useState } from 'react'
import { PlusIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { ConfirmationModal } from '../../components/ui/modal'
import { useAuthStore } from '../../store/auth-store'
import { UserForm } from './user.form'
import { UserList } from './user.list'
import { useUserStore } from './user.store'

export function UsersPage() {
  const role = useAuthStore((state) => state.role)
  const currentUser = useAuthStore((state) => state.user)
  const {
    users,
    branches,
    loading,
    filters,
    setFilters,
    selectedUser,
    setSelectedUser,
    fetchUsers,
    fetchBranches,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
  } = useUserStore()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null)
  const [pendingAction, setPendingAction] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    fetchBranches().catch((error) => {
      toast.error(error.message || 'Failed to load branches')
    })
  }, [fetchBranches])

  useEffect(() => {
    fetchUsers().catch((error) => {
      toast.error(error.message || 'Failed to load users')
    })
  }, [fetchUsers, filters.role, filters.status])

  const stats = useMemo(() => {
    const total = users.length
    const active = users.filter((user) => user.isActive).length
    const byRole = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {})

    return {
      total,
      active,
      byRole,
    }
  }, [users])

  const openCreate = () => {
    setFormMode('create')
    setSelectedUser(null)
    setSubmitError('')
    setIsFormOpen(true)
  }

  const openEdit = (user) => {
    setFormMode('edit')
    setSelectedUser(user)
    setSubmitError('')
    setIsFormOpen(true)
  }

  const canManageUser = (user) => {
    if (!user) return false
    if (currentUser?.id === user.id) return false

    if (role === 'ADMIN') {
      return user.role !== 'ADMIN'
    }

    if (role === 'MANAGER') {
      return !['ADMIN', 'MANAGER'].includes(user.role)
    }

    return false
  }

  const handleSubmit = async (values) => {
    setSubmitError('')

    try {
      setPendingAction('form')

      if (formMode === 'create') {
        await createUser(values)
        toast.success('User created successfully')
      } else {
        const payload = {
          name: values.name,
          email: values.email,
          role: values.role,
          branchId: values.branchId,
        }

        await updateUser(selectedUser.id, payload)

        if (selectedUser?.isActive !== values.isActive) {
          await toggleUserStatus(selectedUser.id, values.isActive)
        }

        toast.success('User updated successfully')
      }

      setIsFormOpen(false)
      setSelectedUser(null)
    } catch (error) {
      setSubmitError(error.message || 'Failed to save user')
      toast.error(error.message || 'Failed to save user')
    } finally {
      setPendingAction('')
    }
  }

  const handleToggleStatus = async (user) => {
    try {
      setPendingAction(`status:${user.id}`)
      await toggleUserStatus(user.id, !user.isActive)
      toast.success(user.isActive ? 'User deactivated' : 'User activated')
    } catch (error) {
      toast.error(error.message || 'Failed to update user status')
    } finally {
      setPendingAction('')
    }
  }

  const handleDelete = async () => {
    if (!confirmDeleteUser) return

    try {
      setPendingAction(`delete:${confirmDeleteUser.id}`)
      await deleteUser(confirmDeleteUser.id)
      toast.success('User deleted successfully')
      setConfirmDeleteUser(null)
    } catch (error) {
      toast.error(error.message || 'Failed to delete user')
    } finally {
      setPendingAction('')
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">User Management</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage organization users, roles, branch assignment, and account status.
          </p>
        </div>
        <Button className="gap-2 sm:w-auto" onClick={openCreate}>
          <PlusIcon className="h-4 w-4" />
          Add User
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Users" value={String(stats.total)} accent="primary" />
        <StatCard title="Active Users" value={String(stats.active)} accent="secondary" />
        <StatCard title="Managers" value={String(stats.byRole.MANAGER || 0)} accent="primary" />
        <StatCard title="Cashiers" value={String(stats.byRole.CASHIER || 0)} accent="secondary" />
      </section>

      <Card className="rounded-3xl">
        <UserList
          users={users}
          loading={loading}
          filters={filters}
          onFiltersChange={setFilters}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
          onDelete={setConfirmDeleteUser}
          canManageUser={canManageUser}
          pendingAction={pendingAction}
        />
      </Card>

      <UserForm
        isOpen={isFormOpen}
        mode={formMode}
        user={selectedUser}
        branches={branches}
        currentRole={role}
        isSubmitting={pendingAction === 'form'}
        submitError={submitError}
        onClose={() => {
          setIsFormOpen(false)
          setSubmitError('')
          setSelectedUser(null)
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(confirmDeleteUser)}
        title="Delete User"
        description={`Are you sure you want to delete ${confirmDeleteUser?.name || 'this user'}?`}
        confirmText="Delete"
        isLoading={pendingAction === `delete:${confirmDeleteUser?.id}`}
        onClose={() => setConfirmDeleteUser(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function StatCard({ title, value, accent = 'primary' }) {
  return (
    <Card className="rounded-3xl">
      <p className="text-sm text-text-secondary">{title}</p>
      <p
        className={
          accent === 'secondary'
            ? 'mt-2 text-2xl font-semibold text-secondary-600'
            : 'mt-2 text-2xl font-semibold text-primary-700'
        }
      >
        {value}
      </p>
    </Card>
  )
}

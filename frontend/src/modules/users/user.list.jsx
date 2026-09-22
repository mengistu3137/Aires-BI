import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Skeleton } from '../../components/ui/skeleton'
import { Table } from '../../components/ui/table'

const ROLE_OPTIONS = [
  { label: 'All roles', value: 'ALL' },
  { label: 'ADMIN', value: 'ADMIN' },
  { label: 'MANAGER', value: 'MANAGER' },
  { label: 'CASHIER', value: 'CASHIER' },
  { label: 'SERVER', value: 'SERVER' },
  { label: 'CHEF', value: 'CHEF' },
]

const STATUS_OPTIONS = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Inactive', value: 'INACTIVE' },
]

export function UserList({
  users,
  loading,
  filters,
  onFiltersChange,
  onEdit,
  onToggleStatus,
  onDelete,
  canManageUser,
  pendingAction,
}) {
  const filteredUsers = users.filter((user) => {
    const search = filters.search.trim().toLowerCase()
    if (!search) return true

    const name = user.name?.toLowerCase() || ''
    const email = user.email?.toLowerCase() || ''
    return name.includes(search) || email.includes(search)
  })

  const columns = [
    {
      key: 'name',
      title: 'Name',
      render: (row) => (
        <div>
          <p className="font-semibold text-text-primary">{row.name}</p>
          <p className="text-xs text-text-secondary">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Email',
      render: (row) => row.email,
    },
    {
      key: 'role',
      title: 'Role',
      render: (row) => <Badge value={row.role} />,
    },
    {
      key: 'branch',
      title: 'Branch',
      render: (row) => row.branch?.name || '-',
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => <Badge value={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      key: 'createdAt',
      title: 'Created Date',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (row) => {
        if (!canManageUser(row)) {
          return <span className="text-xs text-text-secondary">No access</span>
        }

        return (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => onEdit(row)}>
              <PencilSquareIcon className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant={row.isActive ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => onToggleStatus(row)}
              isLoading={pendingAction === `status:${row.id}`}
            >
              {row.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="gap-1"
              onClick={() => onDelete(row)}
              isLoading={pendingAction === `delete:${row.id}`}
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <section className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Input
          label="Search"
          placeholder="Search name or email"
          value={filters.search}
          onChange={(event) => onFiltersChange({ search: event.target.value })}
        />

        <Select
          label="Role"
          options={ROLE_OPTIONS}
          value={filters.role}
          onChange={(event) => onFiltersChange({ role: event.target.value })}
        />

        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(event) => onFiltersChange({ status: event.target.value })}
        />
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table
          columns={columns}
          rows={filteredUsers}
          emptyText="No users matched your filter"
          containerClassName="overflow-x-auto"
        />
      )}
    </section>
  )
}

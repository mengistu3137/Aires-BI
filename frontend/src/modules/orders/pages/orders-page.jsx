import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { PlusIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { RoleGate } from '../../../components/shared/role-gate'
import { PageHeader } from '../../../components/shared/page-header'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Select } from '../../../components/ui/select'
import { Table } from '../../../components/ui/table'
import { hasRoleAccess, ROUTE_ACCESS } from '../../../lib/role-access'
import { useAuthStore } from '../../../store/auth-store'
import { ordersService } from '../../../services/orders.service'
import { ORDER_STATUS } from '../../../types/status'
import { formatCurrency, formatDateTime } from '../../../utils/format'

const STATUS_OPTIONS = [
  { label: 'PENDING', value: ORDER_STATUS.PENDING },
  { label: 'PREPARING', value: ORDER_STATUS.PREPARING },
  { label: 'READY', value: ORDER_STATUS.READY },
  { label: 'COMPLETED', value: ORDER_STATUS.COMPLETED },
]

function StatusEditor({ order, canManageStatus, onSave, isUpdating }) {
  const [nextStatus, setNextStatus] = useState(order.status)

  if (!canManageStatus) {
    return <Badge value={order.status} />
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        className="min-w-36"
        value={nextStatus}
        options={STATUS_OPTIONS}
        onChange={(event) => setNextStatus(event.target.value)}
      />
      <Button
        size="sm"
        variant="ghost"
        disabled={nextStatus === order.status || isUpdating}
        onClick={() => onSave(order.id, nextStatus)}
      >
        Update
      </Button>
    </div>
  )
}

export function OrdersPage() {
  const queryClient = useQueryClient()
  const role = useAuthStore((state) => state.role)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const canManageStatus = hasRoleAccess(role, ROUTE_ACCESS.ORDER_STATUS_MANAGE)

  const queryParams = useMemo(
    () => ({
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    }),
    [statusFilter],
  )

  const { data: orders = [], isFetching: isOrdersLoading } = useQuery({
    queryKey: ['orders', role, queryParams],
    queryFn: () => ordersService.listForRole(role, queryParams),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  })

  const updateStatus = useMutation({
    mutationFn: ({ orderId, status }) => ordersService.updateStatus(orderId, status),
    onSuccess: () => {
      toast.success('Order status updated')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update order status')
    },
  })

  const columns = [
    {
      key: 'id',
      title: 'Order',
      render: (row) => (
        <div>
          <p className="font-semibold text-text-primary">#{row.id.slice(-6).toUpperCase()}</p>
          <p className="text-xs text-text-secondary">{row.type?.replace('_', ' ') || 'DINE IN'}</p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'customerName',
      title: 'Customer',
      render: (row) => row.customerName || '-',
    },
    {
      key: 'creator',
      title: 'Server',
      render: (row) => row.creator?.name || '-',
    },
    {
      key: 'items',
      title: 'Items',
      render: (row) => row._count?.items || 0,
    },
    {
      key: 'totalAmount',
      title: 'Total',
      render: (row) => (
        <span className="font-semibold text-primary-700">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => (
        <StatusEditor
          order={row}
          canManageStatus={canManageStatus}
          isUpdating={updateStatus.isPending}
          onSave={(orderId, status) => updateStatus.mutate({ orderId, status })}
        />
      ),
    },
  ]

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Orders"
        description="Track active orders and monitor status progression in real-time-like refresh cycles."
        action={
          <RoleGate allowedRoles={ROUTE_ACCESS.CREATE_ORDER}>
            <Link to="/orders/create">
              <Button className="gap-2">
                <PlusIcon className="h-4 w-4" />
                Create Order
              </Button>
            </Link>
          </RoleGate>
        }
      />

      <Card className="rounded-3xl">
        <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-text-secondary">Total Orders</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{orders.length}</p>
          </div>

          <Select
            label="Filter by Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={[{ label: 'All Statuses', value: 'ALL' }].concat(STATUS_OPTIONS)}
          />
        </div>

        <Table
          columns={columns}
          rows={orders}
          isLoading={isOrdersLoading}
          loadingText="Refreshing orders..."
          emptyText="No orders found for this filter"
        />
      </Card>
    </div>
  )
}

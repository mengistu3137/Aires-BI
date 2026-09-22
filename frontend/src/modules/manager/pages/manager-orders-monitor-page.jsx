import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { Table } from '../../../components/ui/table'
import { ordersService } from '../../../services/orders.service'
import { useBranchFilterStore } from '../../../store/branch-filter-store'
import { ORDER_STATUS } from '../../../types/status'
import { formatDateTime } from '../../../utils/format'
import { useManagerStore } from '../manager.store'

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: 'ALL' },
  { label: 'PENDING', value: ORDER_STATUS.PENDING },
  { label: 'PREPARING', value: ORDER_STATUS.PREPARING },
  { label: 'READY', value: ORDER_STATUS.READY },
  { label: 'COMPLETED', value: ORDER_STATUS.COMPLETED },
]

function normalizeOrders(data) {
  const rows = data?.items || data || []
  return Array.isArray(rows) ? rows : []
}

function getElapsedMinutes(createdAt) {
  if (!createdAt) return 0
  const diff = Date.now() - new Date(createdAt).getTime()
  return Math.max(0, Math.floor(diff / 60_000))
}

function formatElapsed(createdAt) {
  const totalMinutes = getElapsedMinutes(createdAt)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function isDelayed(order) {
  const minutes = getElapsedMinutes(order?.createdAt)
  const status = order?.status

  if (status === ORDER_STATUS.PENDING) return minutes >= 15
  if (status === ORDER_STATUS.PREPARING) return minutes >= 25
  if (status === ORDER_STATUS.READY) return minutes >= 10
  return false
}

function getTableLabel(order) {
  return order?.tableNo || order?.table || order?.orderType || order?.type || '-'
}

function getItemsSummary(order) {
  const items = order?.items || []
  if (!items.length) return '-'

  const names = items
    .slice(0, 3)
    .map((item) => item?.product?.name || item?.name || 'Item')
    .join(', ')

  if (items.length <= 3) return names
  return `${names} +${items.length - 3} more`
}

function getAssignedChef(order) {
  return order?.chef?.name || order?.assignedChef?.name || order?.assignedChefName || '-'
}

function getServer(order) {
  return order?.server?.name || order?.createdBy?.name || order?.collector?.name || '-'
}

export function ManagerOrdersMonitorPage() {
  const queryClient = useQueryClient()
  const selectedBranchId = useBranchFilterStore((state) => state.selectedBranchId)
  const period = useManagerStore((state) => state.period)
  const dateRange = useManagerStore((state) => state.dateRange)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [nowTick, setNowTick] = useState(Date.now())
  const [overrideDraft, setOverrideDraft] = useState({})

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const params = useMemo(
    () => ({
      ...(selectedBranchId !== 'ALL' ? { branchId: selectedBranchId } : {}),
      ...(dateRange.startDate ? { startDate: dateRange.startDate } : {}),
      ...(dateRange.endDate ? { endDate: dateRange.endDate } : {}),
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    }),
    [selectedBranchId, dateRange, statusFilter],
  )

  const ordersQuery = useQuery({
    queryKey: [
      'manager-orders-monitor',
      selectedBranchId,
      period,
      dateRange.startDate,
      dateRange.endDate,
      statusFilter,
    ],
    queryFn: () => ordersService.list(params),
    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
    staleTime: 5_000,
    placeholderData: (previousData) => previousData,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }) => ordersService.updateStatus(orderId, status),
    onSuccess: () => {
      toast.success('Order status updated')
      queryClient.invalidateQueries({ queryKey: ['manager-orders-monitor'] })
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update status')
    },
  })

  const rows = useMemo(() => {
    const tick = nowTick
    return normalizeOrders(ordersQuery.data).map((order) => ({
      ...order,
      __tick: tick,
    }))
  }, [ordersQuery.data, nowTick])

  const onOverrideApply = (order) => {
    const nextStatus = overrideDraft[order.id] || order.status
    if (!nextStatus || nextStatus === order.status) return

    updateStatusMutation.mutate({
      orderId: order.id,
      status: nextStatus,
    })
  }

  const columns = [
    {
      key: 'id',
      title: 'Order',
      render: (row) => {
        const delayed = isDelayed(row)
        return (
          <div>
            <p
              className={
                delayed ? 'font-semibold text-secondary-700' : 'font-semibold text-text-primary'
              }
            >
              #
              {String(row.id || '')
                .slice(-6)
                .toUpperCase()}
            </p>
            {delayed ? (
              <span className="inline-flex rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-semibold text-secondary-700">
                Delayed
              </span>
            ) : null}
          </div>
        )
      },
    },
    {
      key: 'tableType',
      title: 'Table / Type',
      render: (row) => getTableLabel(row),
    },
    {
      key: 'items',
      title: 'Items',
      render: (row) => getItemsSummary(row),
    },
    {
      key: 'chef',
      title: 'Assigned Chef',
      render: (row) => getAssignedChef(row),
    },
    {
      key: 'server',
      title: 'Server',
      render: (row) => getServer(row),
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => {
        const delayed = isDelayed(row)
        return (
          <span
            className={
              delayed
                ? 'inline-flex rounded-full bg-secondary-100 px-2.5 py-1 text-xs font-semibold text-secondary-700'
                : 'inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700'
            }
          >
            {row.status}
          </span>
        )
      },
    },
    {
      key: 'elapsed',
      title: 'Time Elapsed',
      render: (row) => (
        <div>
          <p
            className={
              isDelayed(row) ? 'font-semibold text-secondary-700' : 'font-medium text-text-primary'
            }
          >
            {formatElapsed(row.createdAt)}
          </p>
          <p className="text-xs text-text-secondary">{formatDateTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'override',
      title: 'Manual Override',
      render: (row) => (
        <div className="flex min-w-52 items-center gap-2">
          <select
            value={overrideDraft[row.id] || row.status}
            onChange={(event) =>
              setOverrideDraft((previous) => ({
                ...previous,
                [row.id]: event.target.value,
              }))
            }
            className="h-9 rounded-lg border border-primary-100/70 bg-surface px-2 text-xs text-text-primary"
          >
            {STATUS_FILTER_OPTIONS.filter((option) => option.value !== 'ALL').map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOverrideApply(row)}
            isLoading={
              updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === row.id
            }
            disabled={(overrideDraft[row.id] || row.status) === row.status}
          >
            Apply
          </Button>
        </div>
      ),
    },
  ]

  if (ordersQuery.isLoading) {
    return <ManagerOrdersSkeleton />
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Orders Monitor</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Live operations board for kitchen and service handoff.
        </p>
      </header>

      <Card className="rounded-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === option.value
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-primary-50/70 text-text-secondary hover:bg-primary-100/60'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={() => ordersQuery.refetch()}>
            Refresh Now
          </Button>
        </div>
      </Card>

      {ordersQuery.isError ? (
        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">
            {ordersQuery.error?.message || 'Failed to load orders monitor'}
          </p>
          <div className="mt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => ordersQuery.refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="rounded-3xl">
        <Table
          columns={columns}
          rows={rows}
          isLoading={ordersQuery.isFetching}
          loadingText="Syncing orders..."
          emptyText="No orders for selected filters"
        />
        <p className="mt-3 text-xs text-text-secondary">
          Auto-refresh every 5 seconds for fast operations monitoring.
        </p>
      </Card>
    </div>
  )
}

function ManagerOrdersSkeleton() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Orders Monitor</h1>
        <p className="mt-1 text-sm text-text-secondary">Loading live order stream...</p>
      </header>

      <Skeleton className="h-20" />
      <Skeleton className="h-96" />
    </div>
  )
}

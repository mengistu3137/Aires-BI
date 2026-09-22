import { useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { PageContainer } from '../components/page-container'
import { ordersService } from '../../../services/orders.service'
import { OrderCard } from '../components/order-card'

function normalizeOrders(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.orders)) return data.orders
  if (Array.isArray(data?.items)) return data.items
  return []
}

export function ServerReadyOrdersPage() {
  const queryClient = useQueryClient()
  const previousCount = useRef(0)

  const readyOrdersQuery = useQuery({
    queryKey: ['server-ready-orders'],
    queryFn: () => ordersService.listReady(),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  })

  const deliverMutation = useMutation({
    mutationFn: ordersService.deliver,
    onSuccess: () => {
      toast.success('Order marked as delivered')
      queryClient.invalidateQueries({ queryKey: ['server-ready-orders'] })
      queryClient.invalidateQueries({ queryKey: ['server-my-orders'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update order')
    },
  })

  const orders = useMemo(() => normalizeOrders(readyOrdersQuery.data), [readyOrdersQuery.data])

  const readyOrders = useMemo(() => {
    return orders
      .filter((order) => order?.status === 'READY')
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
  }, [orders])

  useEffect(() => {
    if (!readyOrdersQuery.isSuccess) return

    if (previousCount.current > 0 && readyOrders.length > previousCount.current) {
      toast.success('New ready order arrived')
    }

    previousCount.current = readyOrders.length
  }, [readyOrders.length, readyOrdersQuery.isSuccess])

  const notificationCount = readyOrders.length

  return (
    <PageContainer
      title="Ready Orders"
      description="View kitchen-ready orders waiting for delivery to customers."
      action={
        <div className="inline-flex items-center gap-2 rounded-xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm font-medium text-secondary-700">
          <BellIcon className={`h-4 w-4 ${notificationCount ? 'animate-pulse' : ''}`} />
          <span>Ready Queue</span>
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-secondary-500 px-2 py-0.5 text-xs font-semibold text-white">
            {notificationCount}
          </span>
        </div>
      }
    >
      <div className="sticky top-16 z-10">
        <Card className="rounded-3xl p-3 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-text-secondary">
              Prepared by CHEF and ready for delivery
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['server-ready-orders'] })}
              isLoading={readyOrdersQuery.isFetching}
            >
              Refresh
            </Button>
          </div>
        </Card>
      </div>

      {readyOrdersQuery.isLoading ? (
        <Card className="rounded-3xl p-5">
          <p className="text-sm text-text-secondary">Loading ready orders...</p>
        </Card>
      ) : null}

      {readyOrdersQuery.isError ? (
        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">
            {readyOrdersQuery.error?.message || 'Failed to load ready orders'}
          </p>
        </Card>
      ) : null}

      {!readyOrdersQuery.isLoading && !readyOrdersQuery.isError ? (
        readyOrders.length ? (
          <section className="grid gap-4">
            {readyOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                highlightReady
                isDelivering={deliverMutation.isPending && deliverMutation.variables === order.id}
                onDeliver={(orderId) => deliverMutation.mutate(orderId)}
              />
            ))}
          </section>
        ) : (
          <Card className="rounded-3xl p-5">
            <p className="text-sm text-text-secondary">No ready orders at the moment.</p>
          </Card>
        )
      ) : null}
    </PageContainer>
  )
}

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Card } from '../../../components/ui/card'
import { PageContainer } from '../components/page-container'
import { ordersService } from '../../../services/orders.service'
import { OrderCard } from '../components/order-card'

const ORDER_TABS = ['PENDING', 'PREPARING', 'READY', 'COMPLETED']

function normalizeOrders(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.orders)) return data.orders
  if (Array.isArray(data?.items)) return data.items
  return []
}

export function ServerMyOrdersPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('PENDING')

  const ordersQuery = useQuery({
    queryKey: ['server-my-orders'],
    queryFn: () => ordersService.listMine(),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  })

  const deliverMutation = useMutation({
    mutationFn: ordersService.deliver,
    onSuccess: () => {
      toast.success('Order marked as delivered')
      queryClient.invalidateQueries({ queryKey: ['server-my-orders'] })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update order')
    },
  })

  const orders = useMemo(() => normalizeOrders(ordersQuery.data), [ordersQuery.data])

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => order?.status === activeTab)
      .sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime())
  }, [orders, activeTab])

  return (
    <PageContainer title="My Orders" description="Track your currently assigned and recent orders.">
      <div className="sticky top-16 z-10">
        <Card className="rounded-3xl border-primary-100/70 p-3 shadow-soft">
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {ORDER_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-text-secondary hover:bg-primary-50/60'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {ordersQuery.isLoading ? (
        <Card className="rounded-3xl border-primary-100/70 p-5">
          <p className="text-sm text-text-secondary">Loading your orders...</p>
        </Card>
      ) : null}

      {ordersQuery.isError ? (
        <Card className="rounded-3xl border-secondary-200 bg-secondary-50 p-5">
          <p className="text-sm text-secondary-700">
            {ordersQuery.error?.message || 'Failed to load orders'}
          </p>
        </Card>
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError ? (
        filteredOrders.length ? (
          <section className="grid gap-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isDelivering={deliverMutation.isPending && deliverMutation.variables === order.id}
                onDeliver={(orderId) => deliverMutation.mutate(orderId)}
              />
            ))}
          </section>
        ) : (
          <Card className="rounded-3xl border-primary-100/70 p-5">
            <p className="text-sm text-text-secondary">
              No {activeTab.toLowerCase()} orders found.
            </p>
          </Card>
        )
      ) : null}
    </PageContainer>
  )
}

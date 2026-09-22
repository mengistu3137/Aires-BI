import { ordersService } from '../../../services/orders.service'
import { deleteQueuedOrder, getQueuedOrders, saveQueuedOrder, updateQueuedOrder } from './pos-db'

function isNetworkFailure(error) {
  return !error?.status || error?.status === 0 || error?.message?.includes('Network')
}

export async function loadQueuedOrders() {
  return getQueuedOrders()
}

export async function queueQuickOrder({ payload, totalAmount = 0, paymentMethod, itemCount = 0 }) {
  const queuedOrder = await saveQueuedOrder({
    payload,
    totalAmount,
    paymentMethod,
    itemCount,
    status: 'pending_sync',
    attempts: 0,
    error: null,
  })

  return queuedOrder
}

export async function syncQueuedOrders({ onSynced, onQueuedFailure } = {}) {
  const queuedOrders = await getQueuedOrders()
  const pendingOrders = queuedOrders.filter((order) => order.status !== 'synced')

  const results = []

  for (const queuedOrder of pendingOrders) {
    try {
      await updateQueuedOrder(queuedOrder.id, {
        status: 'syncing',
        attempts: (queuedOrder.attempts || 0) + 1,
        error: null,
      })

      const response = await ordersService.quickCreate(queuedOrder.payload)

      await deleteQueuedOrder(queuedOrder.id)
      onSynced?.({ queuedOrder, response })
      results.push({ id: queuedOrder.id, status: 'synced' })
    } catch (error) {
      if (isNetworkFailure(error)) {
        await updateQueuedOrder(queuedOrder.id, {
          status: 'pending_sync',
          error: error?.message || 'Network failure',
        })
        onQueuedFailure?.({ queuedOrder, error })
        results.push({ id: queuedOrder.id, status: 'pending_sync' })
        continue
      }

      await updateQueuedOrder(queuedOrder.id, {
        status: 'failed',
        error: error?.message || 'Sync failed',
      })
      onQueuedFailure?.({ queuedOrder, error })
      results.push({ id: queuedOrder.id, status: 'failed' })
    }
  }

  return results
}

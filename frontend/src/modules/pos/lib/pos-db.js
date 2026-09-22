import { deleteDB, openDB } from 'idb'

const DB_NAME = 'milki-quick-pos'
const DB_VERSION = 1
const STORE_NAME = 'queued-orders'

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status')
        store.createIndex('createdAt', 'createdAt')
      }
    },
  })
}

export async function getQueuedOrders() {
  const database = await getDb()
  const records = await database.getAll(STORE_NAME)
  return records.sort((left, right) => left.createdAt - right.createdAt)
}

export async function getQueuedOrder(orderId) {
  const database = await getDb()
  return database.get(STORE_NAME, orderId)
}

export async function saveQueuedOrder(order) {
  const database = await getDb()
  const payload = {
    ...order,
    id: order.id || crypto.randomUUID(),
    createdAt: order.createdAt || Date.now(),
  }

  await database.put(STORE_NAME, payload)
  return payload
}

export async function updateQueuedOrder(orderId, patch) {
  const existing = await getQueuedOrder(orderId)
  if (!existing) return null

  const next = { ...existing, ...patch }
  await saveQueuedOrder(next)
  return next
}

export async function deleteQueuedOrder(orderId) {
  const database = await getDb()
  await database.delete(STORE_NAME, orderId)
}

export async function clearQueuedOrders() {
  await deleteDB(DB_NAME)
}

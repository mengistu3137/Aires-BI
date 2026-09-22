import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  ArrowRightStartOnRectangleIcon,
  BoltIcon,
  ChartBarIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowPathIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  ShoppingCartIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { getRoleHomePath, isHybridMode } from '../../../lib/role-access'
import { CategoryTabs } from '../components/category-tabs'
import { ProductCard } from '../components/product-card'
import { QuickPosSkeleton } from '../components/quick-pos-skeleton'
import { useAppStore } from '../../../store/app-store'
import { useAuthStore } from '../../../store/auth-store'
import { useQuickPosCatalog } from '../hooks/use-quick-pos-queries'
import { playErrorSound, playSuccessSound, playTapSound } from '../lib/pos-sound'
import { cn } from '../../../utils/cn'
import { formatCurrency } from '../../../utils/format'
import { ordersService } from '../../../services/orders.service'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'

const OFFLINE_QUEUE_KEY = 'milki.quick-pos.queue'
const PAYMENT_METHODS = ['CASH', 'BANK', 'MOBILE_MONEY']

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const product = action.payload
      const price = Number(product.price || 0)
      const existingIndex = state.findIndex((item) => item.productId === product.id)

      if (existingIndex >= 0) {
        const next = [...state]
        const item = next[existingIndex]
        const quantity = item.quantity + 1
        next[existingIndex] = {
          ...item,
          quantity,
          subtotal: Number(item.price || 0) * quantity,
        }
        return next
      }

      return state.concat({
        productId: product.id,
        name: product.name,
        price,
        quantity: 1,
        subtotal: price,
      })
    }
    case 'increment': {
      return state.map((item) => {
        if (item.productId !== action.payload) return item
        const quantity = item.quantity + 1
        return {
          ...item,
          quantity,
          subtotal: Number(item.price || 0) * quantity,
        }
      })
    }
    case 'decrement': {
      return state
        .map((item) => {
          if (item.productId !== action.payload) return item
          const quantity = item.quantity - 1
          if (quantity <= 0) return null
          return {
            ...item,
            quantity,
            subtotal: Number(item.price || 0) * quantity,
          }
        })
        .filter(Boolean)
    }
    case 'remove':
      return state.filter((item) => item.productId !== action.payload)
    case 'clear':
      return []
    default:
      return state
  }
}

function getCartTotal(cart = []) {
  return cart.reduce((total, item) => total + Number(item.subtotal || 0), 0)
}

function filterProducts(products, searchQuery, selectedCategoryId) {
  const normalizedQuery = searchQuery.trim().toLowerCase()

  return (products || []).filter((product) => {
    const matchesCategory =
      selectedCategoryId === 'ALL' || product.categoryId === selectedCategoryId
    const matchesSearch =
      !normalizedQuery ||
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.category?.name?.toLowerCase().includes(normalizedQuery)

    return matchesCategory && matchesSearch
  })
}

function isNetworkFailure(error) {
  return !error?.status || error?.status === 0 || error?.message?.includes('Network')
}

function loadOfflineQueue() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveOfflineQueue(queue) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

function createQueueEntry(payload) {
  const random = Math.random().toString(36).slice(2, 10)
  return {
    id: `q_${Date.now()}_${random}`,
    createdAt: new Date().toISOString(),
    payload,
  }
}

export function QuickPosPage() {
  const navigate = useNavigate()
  const syncLockRef = useRef(false)
  const tapGuardRef = useRef(new Map())
  const offlineQueueRef = useRef([])
  const cartRef = useRef([])

  const branch = useAppStore((state) => state.branch)
  const role = useAuthStore((state) => state.role)
  const clearSession = useAuthStore((state) => state.clearSession)

  const [cart, dispatch] = useReducer(cartReducer, [])
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [offlineQueue, setOfflineQueue] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)

  const catalogQuery = useQuickPosCatalog()
  const catalogProducts = catalogQuery.data?.products || []
  const catalogCategories = catalogQuery.data?.categories || []

  const filteredProducts = useMemo(
    () => filterProducts(catalogProducts, searchQuery, selectedCategoryId),
    [catalogProducts, searchQuery, selectedCategoryId],
  )

  const cartTotal = useMemo(() => getCartTotal(cart), [cart])

  const handleTapGuard = useCallback((key, callback) => {
    const now = Date.now()
    const lastTap = tapGuardRef.current.get(key) || 0
    if (now - lastTap < 140) return
    tapGuardRef.current.set(key, now)
    callback()
  }, [])

  const syncPendingOrders = useCallback(async () => {
    if (syncLockRef.current) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    if (offlineQueueRef.current.length === 0) return

    syncLockRef.current = true
    setSyncing(true)

    try {
      let syncedCount = 0
      let failedCount = 0
      const remaining = []

      for (const entry of offlineQueueRef.current) {
        try {
          await ordersService.quickCreate(entry.payload)
          syncedCount += 1
        } catch (error) {
          failedCount += 1
          remaining.push(entry)
          if (!isNetworkFailure(error)) {
            toast.error(error.message || 'Failed to sync a queued order')
          }
        }
      }

      saveOfflineQueue(remaining)
      setOfflineQueue(remaining)

      if (syncedCount > 0) {
        toast.success(`${syncedCount} queued order${syncedCount === 1 ? '' : 's'} synced`)
      }

      if (failedCount > 0) {
        toast.error(`${failedCount} queued order${failedCount === 1 ? '' : 's'} still pending`)
      }
    } finally {
      setSyncing(false)
      syncLockRef.current = false
    }
  }, [])

  const handleConfirmPayment = useCallback(async () => {
    if (!cart.length) {
      toast.error('Cart is empty')
      return
    }
    if (!selectedPaymentMethod) return
    if (isSubmitting) return

    const payload = {
      type: 'TAKEAWAY',
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      paymentMethod: selectedPaymentMethod,
    }

    setIsSubmitting(true)

    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Network offline')
      }

      await ordersService.quickCreate(payload)
      if (soundEnabled) playSuccessSound()
      toast.success('Order completed')
      dispatch({ type: 'clear' })
      setIsPaymentModalOpen(false)
      setSelectedPaymentMethod(null)
    } catch (error) {
      if (isNetworkFailure(error) || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        const entry = createQueueEntry(payload)
        const nextQueue = offlineQueueRef.current.concat(entry)
        saveOfflineQueue(nextQueue)
        setOfflineQueue(nextQueue)
        if (soundEnabled) playSuccessSound()
        toast.success('Order saved offline and will sync later')
        dispatch({ type: 'clear' })
        setIsPaymentModalOpen(false)
        setSelectedPaymentMethod(null)
      } else {
        if (soundEnabled) playErrorSound()
        toast.error(error.message || 'Failed to complete order')
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [cart, isSubmitting, selectedPaymentMethod, soundEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const queue = loadOfflineQueue()
    setOfflineQueue(queue)
    setIsOffline(!navigator.onLine)

    const handleOnline = () => {
      setIsOffline(false)
      syncPendingOrders()
    }

    const handleOffline = () => {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncPendingOrders])

  useEffect(() => {
    offlineQueueRef.current = offlineQueue
  }, [offlineQueue])

  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      syncPendingOrders()
    }
  }, [isOffline, offlineQueue.length, syncPendingOrders])

  const handleProductSelect = useCallback(
    (product) => {
      handleTapGuard(product.id, () => {
        if (soundEnabled) playTapSound()
        dispatch({ type: 'add', payload: product })
      })
    },
    [handleTapGuard, soundEnabled],
  )

  const handleIncrement = useCallback(
    (productId) => {
      handleTapGuard(`inc-${productId}`, () => dispatch({ type: 'increment', payload: productId }))
    },
    [handleTapGuard],
  )

  const handleDecrement = useCallback(
    (productId) => {
      handleTapGuard(`dec-${productId}`, () => dispatch({ type: 'decrement', payload: productId }))
    },
    [handleTapGuard],
  )

  const handleRemove = useCallback(
    (productId) => {
      dispatch({ type: 'remove', payload: productId })
    },
    [dispatch],
  )

  const handleClearCart = useCallback(() => {
    dispatch({ type: 'clear' })
    toast('Cart cleared')
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        dispatch({ type: 'clear' })
        return
      }

      if (event.key === 'F8') {
        event.preventDefault()
        if (!cartRef.current.length) {
          toast.error('Cart is empty')
          return
        }
        setIsPaymentModalOpen(true)
        setSelectedPaymentMethod('CASH')
        return
      }

      if (event.key === 'F9') {
        event.preventDefault()
        if (!cartRef.current.length) {
          toast.error('Cart is empty')
          return
        }
        setIsPaymentModalOpen(true)
        setSelectedPaymentMethod('BANK')
        return
      }

      if (event.key === 'F10') {
        event.preventDefault()
        if (!cartRef.current.length) {
          toast.error('Cart is empty')
          return
        }
        setIsPaymentModalOpen(true)
        setSelectedPaymentMethod('MOBILE_MONEY')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const catalogLoading = catalogQuery.isLoading && catalogProducts.length === 0
  const pageLoading = catalogLoading

  const handleBack = useCallback(() => {
    const fallbackPath = isHybridMode(branch) ? '/mode-select' : getRoleHomePath(role)
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(fallbackPath, { replace: true })
  }, [branch, navigate, role])

  const handleLogout = useCallback(() => {
    clearSession()
    navigate('/login', { replace: true })
  }, [clearSession, navigate])

  const handleOpenPayment = useCallback(() => {
    if (!cart.length) {
      toast.error('Cart is empty')
      return
    }
    setIsPaymentModalOpen(true)
    setSelectedPaymentMethod(null)
  }, [cart.length])

  const handleOpenSales = useCallback(() => {
    navigate('/pos/quick/sales')
  }, [navigate])

  const toggleSoundEnabled = useCallback(() => {
    setSoundEnabled((value) => !value)
  }, [])

  if (pageLoading) {
    return <QuickPosSkeleton />
  }

  return (
    <div
      className="min-h-screen px-3 py-3 text-text-primary sm:px-4"
      style={{
        backgroundImage:
          'radial-gradient(circle at top left, rgba(30,91,255,0.12), transparent 35%), radial-gradient(circle at top right, rgba(255,127,17,0.12), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-primary-700 px-4 py-4 text-white shadow-soft-xl">
          <div className="flex items-center gap-3">
            <BoltIcon className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Quick POS</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-11 gap-2 border border-white/10 bg-white/10 text-white hover:bg-white/15"
              onClick={handleBack}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-11 gap-2 border border-white/10 bg-white/10 text-white hover:bg-white/15"
              onClick={toggleSoundEnabled}
            >
              {soundEnabled ? (
                <SpeakerWaveIcon className="h-4 w-4" />
              ) : (
                <SpeakerXMarkIcon className="h-4 w-4" />
              )}
              {soundEnabled ? 'Sound' : 'Muted'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-11 gap-2 border border-white/10 bg-white/10 text-white hover:bg-white/15"
              onClick={syncPendingOrders}
              isLoading={isSyncing}
            >
              <ArrowPathIcon className="h-4 w-4" />
              Sync
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-11 gap-2 border border-white/10 bg-white/10 text-white hover:bg-white/15"
              onClick={handleOpenSales}
            >
              <ChartBarIcon className="h-4 w-4" />
              My Sales
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="h-11 gap-2 border border-white/10 bg-white/10 text-white hover:bg-white/15"
              onClick={handleLogout}
            >
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
          <Card className="rounded-[1.5rem] border-primary-100/70 bg-surface/95 p-3 shadow-soft-xl">
            <Input
              label="Search"
              placeholder="Search products"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Card>
          <div className="flex items-center justify-between rounded-[1.5rem] border border-primary-100/70 bg-surface/95 px-4 py-3 text-xs text-text-secondary shadow-soft">
            <span>{isOffline ? `${offlineQueue.length} queued` : 'Live'}</span>
            <span>{isOffline ? 'Offline' : 'Online'}</span>
          </div>
        </div>

        <Card className="rounded-[1.5rem] border-primary-100/70 bg-surface/95 p-3 shadow-soft-xl">
          <CategoryTabs
            categories={catalogCategories}
            selectedCategoryId={selectedCategoryId}
            onChange={setSelectedCategoryId}
          />
        </Card>

        <main className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="min-h-0">
            <ProductList
              products={filteredProducts}
              cart={cart}
              onSelectProduct={handleProductSelect}
            />
          </section>

          <aside className="min-h-0 xl:sticky xl:top-3 xl:self-start">
            <CartPanel
              items={cart}
              totalAmount={cartTotal}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onClear={handleClearCart}
              onPay={handleOpenPayment}
              isSubmitting={isSubmitting || isSyncing}
            />
          </aside>
        </main>
      </div>

      <PaymentModal
        isOpen={isPaymentModalOpen}
        totalAmount={cartTotal}
        selectedMethod={selectedPaymentMethod}
        onSelectMethod={setSelectedPaymentMethod}
        onConfirm={handleConfirmPayment}
        onClose={() => setIsPaymentModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}

function ProductList({ products, cart, onSelectProduct }) {
  const cartLookup = useMemo(
    () => new Map(cart.map((item) => [item.productId, item.quantity])),
    [cart],
  )

  return (
    <div className="min-h-[50vh] overflow-y-auto rounded-[1.75rem] border border-primary-100/70 bg-surface/95 p-3 shadow-soft-xl">
      {products.length === 0 ? (
        <div className="grid min-h-[30vh] place-items-center rounded-3xl border border-dashed border-primary-100/70 bg-primary-50/40 px-4 py-10 text-center text-sm text-text-secondary">
          No products matched the current category.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              quantity={cartLookup.get(product.id) || 0}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CartPanel({
  items,
  totalAmount,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onPay,
  isSubmitting,
}) {
  return (
    <Card className="flex h-full flex-col rounded-[1.75rem] border-primary-100/70 bg-surface/95 p-4 shadow-soft-xl">
      <div className="flex items-center justify-between gap-3 border-b border-primary-100/70 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Cart</p>
          <h2 className="text-xl font-bold text-text-primary">Selected items</h2>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-primary-100/70 px-3 text-sm font-semibold text-text-secondary transition active:scale-[0.98]"
        >
          <TrashIcon className="h-4 w-4" />
          Clear
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="grid h-full place-items-center rounded-3xl border border-dashed border-primary-100/70 bg-primary-50/40 px-4 py-10 text-center">
            <div>
              <ShoppingCartIcon className="mx-auto h-10 w-10 text-primary-200" />
              <p className="mt-3 text-sm font-semibold text-text-primary">Cart is empty</p>
              <p className="mt-1 text-xs text-text-secondary">Tap products to start a sale.</p>
            </div>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.productId}
              className="rounded-3xl border border-primary-100/70 bg-primary-50/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-secondary">{formatCurrency(item.price)} each</p>
                </div>
                <p className="text-sm font-bold text-primary-700">
                  {formatCurrency(item.subtotal)}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-full border border-primary-100/70 bg-surface p-1 shadow-sm">
                  <QtyButton icon={MinusIcon} onClick={() => onDecrement(item.productId)} />
                  <span className="min-w-10 px-3 text-center text-sm font-bold text-text-primary">
                    {item.quantity}
                  </span>
                  <QtyButton icon={PlusIcon} onClick={() => onIncrement(item.productId)} />
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.productId)}
                  className="rounded-full px-3 py-2 text-xs font-semibold text-secondary-700 transition active:scale-[0.98]"
                >
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 space-y-4 border-t border-primary-100/70 pt-4">
        <div className="flex items-center justify-between rounded-3xl bg-primary-700 px-4 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Total amount</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
          </div>
          <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
            {items.length} item{items.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="sticky bottom-3 z-10 rounded-3xl border border-primary-100/70 bg-surface/95 p-3 shadow-soft">
          <Button
            className="h-14 w-full text-base"
            onClick={onPay}
            isLoading={isSubmitting}
            disabled={!items.length}
          >
            Pay now
          </Button>
        </div>
      </div>
    </Card>
  )
}

function QtyButton({ icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full text-text-secondary transition active:scale-[0.95] active:bg-primary-50"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

function PaymentModal({
  isOpen,
  totalAmount,
  selectedMethod,
  onSelectMethod,
  onConfirm,
  onClose,
  isSubmitting,
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-text-primary/30" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="glass-panel w-full max-w-lg p-6 shadow-soft-xl">
          <DialogTitle className="text-lg font-semibold text-text-primary">
            Confirm payment
          </DialogTitle>

          <div className="mt-4 rounded-3xl bg-primary-50/60 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">Total</p>
            <p className="mt-1 text-2xl font-bold text-primary-700">
              {formatCurrency(totalAmount)}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
              Select payment method
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => onSelectMethod(method)}
                  className={cn(
                    'min-h-12 rounded-2xl border px-3 text-sm font-semibold transition active:scale-[0.98]',
                    selectedMethod === method
                      ? 'border-primary-500 bg-primary-600 text-white shadow-soft'
                      : 'border-primary-100/70 bg-surface text-text-secondary',
                  )}
                >
                  {method.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              isLoading={isSubmitting}
              disabled={!selectedMethod || isSubmitting}
            >
              Confirm payment
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

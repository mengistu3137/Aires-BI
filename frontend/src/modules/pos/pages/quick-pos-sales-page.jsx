import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { cn } from '../../../utils/cn'
import { formatCurrency } from '../../../utils/format'
import { reportsService } from '../../../services/reports.service'

const SALES_FILTERS = ['today', 'yesterday', 'custom']
const SALES_CACHE_KEY = 'milki.quick-pos.my-sales'

function formatDateInput(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayRange() {
  const today = formatDateInput(new Date())
  return { start: today, end: today }
}

function getYesterdayRange() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const yesterday = formatDateInput(date)
  return { start: yesterday, end: yesterday }
}

function normalizeSalesResponse(payload) {
  const summary = payload?.summary || {}
  const orders = Array.isArray(payload?.orders) ? payload.orders : []
  return { summary, orders }
}

function computeSalesSummary(orders) {
  return orders.reduce(
    (accumulator, order) => {
      const total = Number(order.total || order.totalAmount || order.amount || 0)
      const method = order.payment?.method || order.paymentMethod || order.method || 'CASH'
      accumulator.totalSales += total
      accumulator.totalOrders += 1

      if (method === 'BANK') accumulator.bankTotal += total
      if (method === 'MOBILE_MONEY') accumulator.mobileTotal += total
      if (method === 'CASH') accumulator.cashTotal += total

      return accumulator
    },
    {
      totalSales: 0,
      cashTotal: 0,
      bankTotal: 0,
      mobileTotal: 0,
      totalOrders: 0,
    },
  )
}

function buildProductSummary(orders) {
  const grouped = new Map()

  orders.forEach((order) => {
    const items = Array.isArray(order.items) ? order.items : []
    items.forEach((item) => {
      const productType = item.productType || item.type || 'OTHER'
      if (!grouped.has(productType)) {
        grouped.set(productType, new Map())
      }

      const typeBucket = grouped.get(productType)
      const productId = item.productId || item.name || 'unknown'
      if (!typeBucket.has(productId)) {
        typeBucket.set(productId, {
          productId,
          name: item.name || item.productName || 'Item',
          quantity: 0,
          total: 0,
        })
      }

      const entry = typeBucket.get(productId)
      const quantity = Number(item.quantity || 0)
      const unitPrice = Number(item.unitPrice || item.price || 0)
      const total = Number(item.total || item.subtotal || 0) || quantity * unitPrice

      entry.quantity += quantity
      entry.total += total
    })
  })

  return [...grouped.entries()].map(([type, products]) => ({
    type,
    products: [...products.values()].sort((a, b) => b.total - a.total),
  }))
}

function formatOrderTime(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleTimeString()
}

export function QuickPosSalesPage() {
  const navigate = useNavigate()
  const [salesFilter, setSalesFilter] = useState('today')
  const [salesStartDate, setSalesStartDate] = useState(getTodayRange().start)
  const [salesEndDate, setSalesEndDate] = useState(getTodayRange().end)
  const [salesData, setSalesData] = useState({ summary: null, orders: [] })
  const [isSalesLoading, setIsSalesLoading] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState(() => new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const salesCacheRef = useRef(new Map())
  const pageSize = 8

  const salesSummary = useMemo(() => {
    const serverSummary = salesData.summary
    if (serverSummary && Object.keys(serverSummary).length > 0) {
      return {
        totalSales: Number(serverSummary.totalSales || serverSummary.totalRevenue || 0),
        cashTotal: Number(serverSummary.cashTotal || serverSummary.cash || 0),
        bankTotal: Number(serverSummary.bankTotal || serverSummary.bank || 0),
        mobileTotal: Number(serverSummary.mobileTotal || serverSummary.mobile || 0),
        totalOrders: Number(serverSummary.totalOrders || serverSummary.orders || 0),
      }
    }
    return computeSalesSummary(salesData.orders)
  }, [salesData])

  const productSummary = useMemo(() => buildProductSummary(salesData.orders), [salesData.orders])

  const totalPages = Math.max(1, Math.ceil(salesData.orders.length / pageSize))
  const pagedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return salesData.orders.slice(start, start + pageSize)
  }, [currentPage, pageSize, salesData.orders])

  useEffect(() => {
    const cached = window.localStorage.getItem(SALES_CACHE_KEY)
    if (!cached) return undefined

    try {
      const parsed = JSON.parse(cached)
      if (parsed?.key && parsed?.data) {
        salesCacheRef.current.set(parsed.key, parsed.data)
      }
    } catch {
      return undefined
    }

    return undefined
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const handleChange = (event) => setIsLargeScreen(event.matches)

    setIsLargeScreen(mediaQuery.matches)
    mediaQuery.addEventListener?.('change', handleChange)

    return () => mediaQuery.removeEventListener?.('change', handleChange)
  }, [])

  useEffect(() => {
    const startDate = salesStartDate
    const endDate = salesEndDate

    if (!startDate || !endDate) return undefined

    const timer = setTimeout(async () => {
      const cacheKey = `${startDate}:${endDate}`
      if (salesCacheRef.current.has(cacheKey)) {
        setSalesData(salesCacheRef.current.get(cacheKey))
        return
      }

      setIsSalesLoading(true)

      try {
        const result = await reportsService.mySales({ startDate, endDate })
        const normalized = normalizeSalesResponse(result)
        salesCacheRef.current.set(cacheKey, normalized)
        window.localStorage.setItem(
          SALES_CACHE_KEY,
          JSON.stringify({ key: cacheKey, data: normalized }),
        )
        setSalesData(normalized)
        setCurrentPage(1)
        setExpandedOrders(new Set())
      } catch (error) {
        toast.error(error.message || 'Failed to load sales report')
      } finally {
        setIsSalesLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [salesStartDate, salesEndDate])

  useEffect(() => {
    if (!pagedOrders.length) return

    if (isLargeScreen) {
      setExpandedOrders(
        new Set(pagedOrders.map((order) => order.id || order.orderId || order.reference || 'N/A')),
      )
    } else {
      setExpandedOrders(new Set())
    }
  }, [isLargeScreen, pagedOrders])

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/pos/quick', { replace: true })
  }, [navigate])

  const handleToggleOrder = useCallback((orderId) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }, [])

  return (
    <div
      className="min-h-screen px-3 py-3 text-text-primary sm:px-4"
      style={{
        backgroundImage:
          'radial-gradient(circle at top left, rgba(30,91,255,0.12), transparent 35%), radial-gradient(circle at top right, rgba(255,127,17,0.12), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)',
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-5xl flex-col gap-4">
        <header className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] bg-primary-700 px-4 py-4 text-white shadow-soft-xl">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              className="h-11 gap-2 border border-white/10 bg-white/10 text-white hover:bg-white/15"
              onClick={handleBack}
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to POS
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/70">My Sales</p>
              <h1 className="text-lg font-semibold">Quick POS Report</h1>
            </div>
          </div>
          <ChartBarIcon className="h-6 w-6 text-white/70" />
        </header>

        <Card className="rounded-[1.5rem] border-primary-100/70 bg-surface/95 p-4 shadow-soft-xl">
          <div className="flex flex-wrap gap-2">
            {SALES_FILTERS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setSalesFilter(value)
                  if (value === 'today') {
                    const range = getTodayRange()
                    setSalesStartDate(range.start)
                    setSalesEndDate(range.end)
                  }
                  if (value === 'yesterday') {
                    const range = getYesterdayRange()
                    setSalesStartDate(range.start)
                    setSalesEndDate(range.end)
                  }
                }}
                className={cn(
                  'min-h-11 rounded-full border px-4 text-sm font-semibold transition active:scale-[0.98]',
                  salesFilter === value
                    ? 'border-primary-500 bg-primary-600 text-white shadow-soft'
                    : 'border-primary-100/70 bg-surface text-text-secondary',
                )}
              >
                {value === 'today' ? 'Today' : value === 'yesterday' ? 'Yesterday' : 'Custom'}
              </button>
            ))}
          </div>

          {salesFilter === 'custom' && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Input
                type="date"
                label="Start date"
                value={salesStartDate}
                onChange={(event) => setSalesStartDate(event.target.value)}
              />
              <Input
                type="date"
                label="End date"
                value={salesEndDate}
                onChange={(event) => setSalesEndDate(event.target.value)}
              />
            </div>
          )}
        </Card>

        <div className="rounded-[1.5rem] border border-primary-100/70 bg-surface/95 p-4 shadow-soft-xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryCard label="Total sales" value={formatCurrency(salesSummary.totalSales)} />
            <SummaryCard label="Cash" value={formatCurrency(salesSummary.cashTotal)} />
            <SummaryCard label="Bank" value={formatCurrency(salesSummary.bankTotal)} />
            <SummaryCard label="Mobile" value={formatCurrency(salesSummary.mobileTotal)} />
            <SummaryCard label="Orders" value={`${salesSummary.totalOrders}`} />
          </div>
        </div>

        {isSalesLoading ? (
          <SalesReportSkeleton />
        ) : productSummary.length === 0 ? (
          <div className="grid min-h-[30vh] place-items-center rounded-[1.5rem] border border-dashed border-primary-100/70 bg-primary-50/40 px-4 py-10 text-center text-sm text-text-secondary">
            No sales found in this range.
          </div>
        ) : (
          <div className="space-y-4">
            {productSummary.map((group) => (
              <Card
                key={group.type}
                className="rounded-[1.5rem] border-primary-100/70 bg-surface/95 p-4 shadow-soft-xl"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">
                    {group.type.replace('_', ' ')}
                  </p>
                  <span className="text-xs text-text-secondary">
                    {group.products.length} products
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {group.products.map((product) => (
                    <div
                      key={`${group.type}-${product.productId}`}
                      className="flex items-center justify-between rounded-2xl bg-primary-50/60 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{product.name}</p>
                        <p className="text-xs text-text-secondary">Qty {product.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-primary-700">
                        {formatCurrency(product.total)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            <Card className="rounded-[1.5rem] border-primary-100/70 bg-surface/95 p-4 shadow-soft-xl">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Order list</p>
                <span className="text-xs text-text-secondary">
                  {salesData.orders.length} order{salesData.orders.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {pagedOrders.map((order) => {
                  const orderId = order.id || order.orderId || order.reference || 'N/A'
                  const total = Number(order.total || order.totalAmount || order.amount || 0)
                  const method = order.payment?.method || order.paymentMethod || 'CASH'
                  const time = order.createdAt || order.time || order.date
                  const items = Array.isArray(order.items) ? order.items : []
                  const isExpanded = expandedOrders.has(orderId)

                  return (
                    <div
                      key={orderId}
                      className="rounded-2xl border border-primary-100/70 bg-primary-50/60 p-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">
                            {method.replace('_', ' ')} sale
                          </p>
                          <p className="text-xs text-text-secondary">
                            {formatOrderTime(time)} · {items.length} item
                            {items.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-primary-700">
                            {formatCurrency(total)}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleToggleOrder(orderId)}
                            className="rounded-full border border-primary-100/70 px-3 py-1 text-[0.7rem] font-semibold text-text-secondary"
                          >
                            {isExpanded ? 'Hide details' : 'Show details'}
                          </button>
                        </div>
                      </div>
                      <div
                        className={cn(
                          'grid gap-1 overflow-hidden text-xs text-text-secondary transition-all',
                          isExpanded ? 'mt-2 max-h-64 opacity-100' : 'max-h-0 opacity-0',
                        )}
                      >
                        {items.map((item) => (
                          <div
                            key={`${orderId}-${item.productId || item.name}`}
                            className="flex items-center justify-between"
                          >
                            <span>{item.name || item.productName || 'Item'}</span>
                            <span>
                              {item.quantity} x {formatCurrency(item.unitPrice || item.price || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-text-secondary">
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 px-3"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-primary-100/70 bg-white/80 px-3 py-3 shadow-sm">
      <p className="text-[0.65rem] uppercase tracking-[0.18em] text-text-secondary">{label}</p>
      <p className="mt-2 text-lg font-bold text-text-primary">{value}</p>
    </div>
  )
}

function SalesReportSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`sales-skeleton-${index}`}
          className="animate-pulse rounded-[1.5rem] border border-primary-100/70 bg-surface/95 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-32 rounded-full bg-primary-100" />
              <div className="h-2 w-40 rounded-full bg-primary-50" />
            </div>
            <div className="space-y-2 text-right">
              <div className="h-3 w-20 rounded-full bg-primary-100" />
              <div className="h-2 w-16 rounded-full bg-primary-50" />
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <div className="h-2 w-full rounded-full bg-primary-50" />
            <div className="h-2 w-5/6 rounded-full bg-primary-50" />
          </div>
        </div>
      ))}
    </div>
  )
}

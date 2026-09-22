import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { Navigate, useNavigate } from 'react-router-dom'
import { List as VirtualList } from 'react-window'
import { toast } from 'sonner'
import { useKitchenStore } from '../kitchen.store'
import { useAuthStore } from '../../../store/auth-store'
import { ConfirmationModal } from '../../../components/ui/modal'
import { Skeleton } from '../../../components/ui/skeleton'
import { ordersService } from '../../../services/orders.service'
import { getRoleHomePath } from '../../../lib/role-access'
import { USER_ROLES } from '../../../types/status'
import { KitchenOrderCard } from '../components/kitchen-order-card'

const POLL_INTERVAL_MS = 5000
const INACTIVE_POLL_INTERVAL_MS = 15000
const HIDDEN_POLL_INTERVAL_MS = 30000
const ACTIVE_TAB_DEBOUNCE_MS = 900
const INITIAL_TIMESTAMP = Date.now()
const NEW_ORDER_HIGHLIGHT_MS = 15000
const KITCHEN_CACHE_VERSION = 'v1'
const VIRTUAL_ROW_HEIGHT = 460

const TABS = [
  { key: 'NEW', label: 'New Orders', status: 'PENDING' },
  { key: 'PREPARING', label: 'Preparing', status: 'PREPARING' },
  { key: 'READY', label: 'Ready', status: 'READY' },
]

export function KitchenDashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const activeTab = useKitchenStore((state) => state.activeTab)
  const setActiveTab = useKitchenStore((state) => state.setActiveTab)
  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [newOrderMarks, setNewOrderMarks] = useState({})
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  )
  const [debouncedActiveStatus, setDebouncedActiveStatus] = useState(TABS[0].status)
  const branchId = user?.branchId
  const audioRef = useRef(null)
  const virtualListRef = useRef(null)
  const previousPendingIdsRef = useRef(new Set())
  const hasBranch = Boolean(branchId)

  if (role !== USER_ROLES.CHEF) {
    return <Navigate to={getRoleHomePath(role)} replace />
  }

  const getStatusQueryKey = useCallback(
    (status) => ['kitchen-orders', status, branchId],
    [branchId],
  )

  const statusQueries = useQueries({
    queries: TABS.map((tab) => ({
      queryKey: ['kitchen-orders', tab.status, branchId],
      queryFn: async () => {
        const response = await ordersService.kitchenList({
          status: tab.status,
          branchId,
        })

        const rows = normalizeKitchenOrders(response)
          .map(mapKitchenOrder)
          .sort(
            (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime(),
          )

        persistKitchenOrders(tab.status, branchId, rows)
        return rows
      },
      initialData: () => readCachedKitchenOrders(tab.status, branchId),
      enabled: Boolean(user && role === USER_ROLES.CHEF && hasBranch),
      refetchInterval: resolveKitchenPollInterval(
        tab.status,
        debouncedActiveStatus,
        isDocumentVisible,
      ),
      refetchIntervalInBackground: true,
      staleTime: 2000,
    })),
  })

  const summaryQuery = useQuery({
    queryKey: ['kitchen-summary', branchId],
    queryFn: async () => {
      const response = await ordersService.kitchenSummary({
        branchId,
      })

      return normalizeKitchenSummary(response)
    },
    enabled: Boolean(user && role === USER_ROLES.CHEF && hasBranch),
    refetchInterval: isDocumentVisible ? INACTIVE_POLL_INTERVAL_MS : HIDDEN_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
    staleTime: 2000,
  })

  const updateMutation = useMutation({
    mutationFn: ({ orderId, status }) => ordersService.kitchenUpdateStatus(orderId, status),
    onMutate: async ({ orderId, status }) => {
      setPendingAction({ orderId, status })

      await Promise.all(
        TABS.map((tab) => queryClient.cancelQueries({ queryKey: getStatusQueryKey(tab.status) })),
      )

      const previousByStatus = {}
      let movingOrder = null
      let fromStatus = null

      TABS.forEach((tab) => {
        const statusKey = tab.status
        const key = getStatusQueryKey(statusKey)
        const rows = queryClient.getQueryData(key) || []
        previousByStatus[statusKey] = rows

        const found = rows.find((order) => order.id === orderId)
        if (found) {
          movingOrder = found
          fromStatus = statusKey
        }
      })

      if (!movingOrder || !fromStatus || fromStatus === status) {
        return { previousByStatus }
      }

      queryClient.setQueryData(getStatusQueryKey(fromStatus), (old = []) =>
        old.filter((order) => order.id !== orderId),
      )

      queryClient.setQueryData(getStatusQueryKey(status), (old = []) => [
        {
          ...movingOrder,
          status,
          updatedAt: new Date().toISOString(),
        },
        ...old,
      ])

      return { previousByStatus }
    },
    onSuccess: () => {
      toast.success('Order status updated')
      setConfirmTarget(null)
    },
    onError: (error, _variables, context) => {
      if (context?.previousByStatus) {
        TABS.forEach((tab) => {
          queryClient.setQueryData(
            getStatusQueryKey(tab.status),
            context.previousByStatus[tab.status] || [],
          )
        })
      }

      if (isUnauthorizedError(error)) {
        toast.error('You are not authorized to access kitchen orders.')
        navigate(getRoleHomePath(role), { replace: true })
        return
      }

      toast.error(error.message || 'Failed to update order status')
    },
    onSettled: () => {
      setPendingAction(null)
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
    },
  })

  const dataByStatus = useMemo(() => {
    return TABS.reduce((acc, tab, index) => {
      acc[tab.status] = statusQueries[index]?.data ?? []
      return acc
    }, {})
  }, [statusQueries])

  const now = useMemo(
    () =>
      statusQueries.reduce((latest, query) => Math.max(latest, query?.dataUpdatedAt || 0), 0) ||
      INITIAL_TIMESTAMP,
    [statusQueries],
  )

  const selectedTab = TABS.find((tab) => tab.key === activeTab) || TABS[0]
  const selectedStatus = selectedTab.status
  const activeStatusQuery = statusQueries[TABS.findIndex((tab) => tab.status === selectedStatus)]

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedActiveStatus(selectedStatus)
    }, ACTIVE_TAB_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [selectedStatus])

  useEffect(() => {
    function onVisibilityChange() {
      setIsDocumentVisible(!document.hidden)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const counts = useMemo(
    () => ({
      PENDING: dataByStatus.PENDING?.length || 0,
      PREPARING: dataByStatus.PREPARING?.length || 0,
      READY: dataByStatus.READY?.length || 0,
    }),
    [dataByStatus],
  )

  const filteredOrders = dataByStatus[selectedStatus] || []
  const pendingOrders = dataByStatus.PENDING || []
  const isLoadingActive = Boolean(activeStatusQuery?.isLoading)
  const isErrorActive = Boolean(activeStatusQuery?.isError)
  const activeErrorMessage = activeStatusQuery?.error?.message || 'Failed to load kitchen orders.'

  const handleStartPreparing = useCallback(
    (orderId) => {
      updateMutation.mutate({ orderId, status: 'PREPARING' })
    },
    [updateMutation],
  )

  const handleRequestMarkReady = useCallback((order) => {
    setConfirmTarget(order)
  }, [])

  const handleConfirmMarkReady = useCallback(() => {
    if (!confirmTarget?.id) return

    updateMutation.mutate({
      orderId: confirmTarget.id,
      status: 'READY',
    })
  }, [confirmTarget, updateMutation])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] })
  }, [queryClient])

  const handleInstallApp = useCallback(async () => {
    if (!deferredInstallPrompt) return

    deferredInstallPrompt.prompt()
    const choice = await deferredInstallPrompt.userChoice

    if (choice?.outcome === 'accepted') {
      toast.success('App installation started')
    }

    setDeferredInstallPrompt(null)
  }, [deferredInstallPrompt])

  const isConfirmPending =
    updateMutation.isPending &&
    pendingAction?.orderId === confirmTarget?.id &&
    pendingAction?.status === 'READY'

  const summary = summaryQuery.data || {
    totalToday: 0,
    preparing: 0,
    ready: 0,
    avgPrepTimeMinutes: null,
  }

  const playNewOrderSound = useCallback(() => {
    if (!audioRef.current) return

    audioRef.current.currentTime = 0
    audioRef.current.play().catch(() => {
      // Ignore autoplay restrictions in browsers until user interaction.
    })
  }, [])

  useEffect(() => {
    if (!hasBranch) return

    const nowMs = Date.now()
    const currentPendingIds = new Set(pendingOrders.map((order) => order.id))
    const previousPendingIds = previousPendingIdsRef.current

    const newlyArrived = pendingOrders.filter(
      (order) => order?.id && !previousPendingIds.has(order.id),
    )

    if (newlyArrived.length > 0) {
      playNewOrderSound()

      setNewOrderMarks((previous) => {
        const next = { ...previous }
        let changed = false

        Object.entries(next).forEach(([orderId, createdAtMs]) => {
          if (
            !currentPendingIds.has(orderId) ||
            nowMs - Number(createdAtMs) > NEW_ORDER_HIGHLIGHT_MS
          ) {
            delete next[orderId]
            changed = true
          }
        })

        newlyArrived.forEach((order) => {
          if (!next[order.id]) {
            next[order.id] = nowMs
            changed = true
          }
        })

        return changed ? next : previous
      })

      if (selectedStatus === 'PENDING') {
        requestAnimationFrame(() => {
          virtualListRef.current?.scrollToRow({ index: 0, align: 'start' })
        })
      }
    } else {
      setNewOrderMarks((previous) => {
        const next = { ...previous }
        let changed = false

        Object.entries(next).forEach(([orderId, createdAtMs]) => {
          if (
            !currentPendingIds.has(orderId) ||
            nowMs - Number(createdAtMs) > NEW_ORDER_HIGHLIGHT_MS
          ) {
            delete next[orderId]
            changed = true
          }
        })

        return changed ? next : previous
      })
    }

    previousPendingIdsRef.current = currentPendingIds
  }, [hasBranch, pendingOrders, playNewOrderSound, selectedStatus])

  useEffect(() => {
    if (!hasBranch) return

    const hasUnauthorizedOrdersError = statusQueries.some((query) =>
      isUnauthorizedError(query?.error),
    )

    if (hasUnauthorizedOrdersError || isUnauthorizedError(summaryQuery.error)) {
      toast.error('You are not authorized to view kitchen data.')
      navigate(getRoleHomePath(role), { replace: true })
    }
  }, [hasBranch, navigate, role, statusQueries, summaryQuery.error])

  useEffect(() => {
    function onBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  const virtualListHeight = useMemo(() => {
    if (!filteredOrders.length) return VIRTUAL_ROW_HEIGHT
    return Math.min(filteredOrders.length * VIRTUAL_ROW_HEIGHT, 920)
  }, [filteredOrders.length])

  const virtualItemData = useMemo(
    () => ({
      orders: filteredOrders,
      now,
      newOrderMarks,
      onStartPreparing: handleStartPreparing,
      onRequestMarkReady: handleRequestMarkReady,
      isPendingUpdate: updateMutation.isPending,
      pendingAction,
    }),
    [
      filteredOrders,
      now,
      newOrderMarks,
      handleStartPreparing,
      handleRequestMarkReady,
      updateMutation.isPending,
      pendingAction,
    ],
  )

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a_0%,#020617_45%,#000000_100%)] px-3 py-4 text-slate-100 sm:px-4 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-800/80 bg-slate-950/65 p-5 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Chef Console
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
                Kitchen Dashboard
              </h1>
              {!hasBranch ? (
                <p className="mt-2 text-base text-amber-300">
                  Branch assignment is required to use Kitchen.
                </p>
              ) : null}
            </div>

            <div className="space-y-1 text-base text-slate-300 md:text-right">
              <p className="text-lg font-semibold text-slate-100">{user?.name || 'Kitchen Chef'}</p>
              <p>{new Date(now).toLocaleDateString()}</p>
              <p>{new Date(now).toLocaleTimeString()}</p>
            </div>
          </div>

          {deferredInstallPrompt ? (
            <div className="mt-4 rounded-xl border border-sky-400/30 bg-sky-500/10 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-base font-medium text-sky-100">
                  Install Kitchen App for full-screen and faster launch.
                </p>
                <button
                  type="button"
                  onClick={handleInstallApp}
                  className="min-h-12 rounded-xl bg-sky-400 px-4 py-2 text-base font-semibold text-sky-950 transition hover:bg-sky-300"
                >
                  Install App
                </button>
              </div>
            </div>
          ) : null}
        </header>

        {!hasBranch ? (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center text-amber-100">
            <p className="text-lg font-semibold">Kitchen access requires a branch assignment.</p>
            <p className="mt-2 text-base text-amber-200">
              Ask your administrator to assign you to a branch before using this module.
            </p>
          </section>
        ) : null}

        {hasBranch ? (
          <section className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="New" value={counts.PENDING} accent="text-amber-300" />
            <MetricCard label="Preparing" value={counts.PREPARING} accent="text-sky-300" />
            <MetricCard label="Ready" value={counts.READY} accent="text-emerald-300" />
          </section>
        ) : null}

        {hasBranch ? (
          <section className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                Kitchen Summary
              </p>
              {summaryQuery.isFetching ? (
                <span className="text-sm text-slate-500">Updating...</span>
              ) : null}
            </div>

            {summaryQuery.isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={idx} className="h-20 rounded-xl bg-slate-800" />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryStat label="Total Today" value={summary.totalToday} />
                <SummaryStat label="Preparing" value={summary.preparing} />
                <SummaryStat label="Ready" value={summary.ready} />
                <SummaryStat
                  label="Avg Prep Time"
                  value={
                    summary.avgPrepTimeMinutes === null ? '-' : `${summary.avgPrepTimeMinutes} min`
                  }
                />
              </div>
            )}

            {summaryQuery.isError ? (
              <p className="mt-3 text-sm text-red-300">
                {summaryQuery.error?.message || 'Unable to load kitchen summary'}
              </p>
            ) : null}
          </section>
        ) : null}

        {hasBranch ? (
          <section className="sticky top-2 z-30 rounded-2xl border border-slate-800/90 bg-slate-950/85 p-3 backdrop-blur sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              {TABS.map((tab) => {
                const tabCount = counts[tab.status] || 0
                const isActive = tab.key === selectedTab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={
                      isActive
                        ? 'min-h-12 rounded-xl bg-slate-100 px-4 py-2 text-base font-semibold text-slate-900'
                        : 'min-h-12 rounded-xl bg-slate-900 px-4 py-2 text-base font-semibold text-slate-300 transition hover:bg-slate-800'
                    }
                  >
                    {tab.label} ({tabCount})
                  </button>
                )
              })}

              <button
                type="button"
                onClick={handleRefresh}
                className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-base font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </section>
        ) : null}

        {hasBranch && isLoadingActive ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="h-64 rounded-2xl bg-slate-800" />
            ))}
          </section>
        ) : null}

        {hasBranch && isErrorActive ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-200">
            <p className="text-lg font-semibold">
              Unable to load {selectedTab.label.toLowerCase()}.
            </p>
            <p className="mt-2 text-base">{activeErrorMessage}</p>
          </section>
        ) : null}

        {hasBranch && !isLoadingActive && !isErrorActive && filteredOrders.length === 0 ? (
          <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-10 text-center text-base text-slate-300">
            No orders in {selectedTab.label.toLowerCase()} right now.
          </section>
        ) : null}

        {hasBranch && !isLoadingActive && !isErrorActive && filteredOrders.length > 0 ? (
          <section className="rounded-2xl border border-slate-800/70 bg-slate-950/35 p-2">
            <VirtualList
              listRef={virtualListRef}
              rowCount={filteredOrders.length}
              rowHeight={VIRTUAL_ROW_HEIGHT}
              rowProps={virtualItemData}
              rowComponent={KitchenVirtualRowMemo}
              style={{ height: virtualListHeight }}
              overscanCount={6}
            />
          </section>
        ) : null}
      </div>

      <ConfirmationModal
        isOpen={Boolean(confirmTarget)}
        title="Mark Order as Ready"
        description={`Mark order #${confirmTarget?.ticketNo || ''} as ready for server pickup?`}
        confirmText="Mark as Ready"
        isLoading={isConfirmPending}
        onClose={() => {
          if (updateMutation.isPending) return
          setConfirmTarget(null)
        }}
        onConfirm={handleConfirmMarkReady}
      />

      <audio ref={audioRef} src="/sounds/notification.mp3" preload="metadata" />
    </div>
  )
}

function MetricCard({ label, value, accent }) {
  return (
    <article className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
      <p className="text-base font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-2 text-4xl font-semibold ${accent}`}>{value}</p>
    </article>
  )
}

function SummaryStat({ label, value }) {
  return (
    <article className="rounded-xl border border-slate-800/80 bg-slate-900/80 p-3">
      <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </article>
  )
}

function getKitchenCacheKey(status, branchPart) {
  return `kitchen-orders:${KITCHEN_CACHE_VERSION}:${status}:${branchPart}`
}

function persistKitchenOrders(status, branchPart, rows) {
  try {
    const payload = {
      savedAt: Date.now(),
      rows,
    }

    localStorage.setItem(getKitchenCacheKey(status, branchPart), JSON.stringify(payload))
  } catch {
    // Ignore storage failures in private mode or restricted environments.
  }
}

function isUnauthorizedError(error) {
  const status = Number(error?.status)
  if (status === 401 || status === 403) return true

  const message = String(error?.message || '').toLowerCase()
  return message.includes('unauthorized') || message.includes('forbidden')
}

function readCachedKitchenOrders(status, branchPart) {
  try {
    const raw = localStorage.getItem(getKitchenCacheKey(status, branchPart))
    if (!raw) return []

    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.rows) ? parsed.rows : []
  } catch {
    return []
  }
}

function normalizeKitchenOrders(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.orders)) return payload.orders
  if (Array.isArray(payload?.items)) return payload.items
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

function normalizeKitchenSummary(payload) {
  const source = payload || {}

  const totalToday =
    source.totalToday ?? source.totalOrdersToday ?? source.todayTotal ?? source.total ?? 0

  const preparing =
    source.preparing ?? source.ordersPreparing ?? source.preparingCount ?? source.inProgress ?? 0

  const ready = source.ready ?? source.ordersReady ?? source.readyCount ?? 0

  const avgPrepTimeRaw =
    source.avgPreparationTime ??
    source.avgPrepTime ??
    source.averagePreparationTime ??
    source.avgPreparationTimeMinutes ??
    null

  return {
    totalToday: Number(totalToday) || 0,
    preparing: Number(preparing) || 0,
    ready: Number(ready) || 0,
    avgPrepTimeMinutes:
      avgPrepTimeRaw === null || avgPrepTimeRaw === undefined
        ? null
        : Math.round(Number(avgPrepTimeRaw) || 0),
  }
}

function mapKitchenOrder(order) {
  const safeItems = Array.isArray(order?.items) ? order.items : []

  return {
    id: order?.id,
    ticketNo:
      String(order?.id || '')
        .slice(-6)
        .toUpperCase() || '------',
    tableNo: order?.tableNo || '-',
    serverName: order?.creator?.name || order?.server?.name || 'Unknown Server',
    status: order?.status,
    createdAt: order?.createdAt,
    items: safeItems.map((item, idx) => ({
      id: item?.id || `${order?.id || 'order'}-${idx}`,
      name: item?.product?.name || item?.name || item?.itemName || 'Item',
      qty: Number(item?.quantity || item?.qty || 1),
    })),
  }
}

const KitchenVirtualRow = ({
  index,
  style,
  orders,
  now,
  newOrderMarks,
  onStartPreparing,
  onRequestMarkReady,
  isPendingUpdate,
  pendingAction,
}) => {
  const order = orders?.[index]

  if (!order) return null

  return (
    <div style={style} className="px-1 py-2">
      <KitchenOrderCard
        cardId={`kitchen-order-${order.id}`}
        order={order}
        now={now}
        isNew={Boolean(newOrderMarks?.[order.id])}
        onStartPreparing={onStartPreparing}
        onRequestMarkReady={onRequestMarkReady}
        isBusy={isPendingUpdate && pendingAction?.orderId === order.id}
      />
    </div>
  )
}

const KitchenVirtualRowMemo = memo(KitchenVirtualRow)

function resolveKitchenPollInterval(status, activeStatus, isVisible) {
  if (!isVisible) return HIDDEN_POLL_INTERVAL_MS
  if (status === activeStatus) return POLL_INTERVAL_MS
  return INACTIVE_POLL_INTERVAL_MS
}

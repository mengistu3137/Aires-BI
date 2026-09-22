import { memo } from 'react'
import { ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import { cn } from '../../../utils/cn'
import { TimeAgo } from './time-ago'
import { StatusBadge } from './status-badge'

export const KitchenOrderCard = memo(function KitchenOrderCard({
  cardId,
  order,
  now,
  isNew = false,
  onStartPreparing,
  onRequestMarkReady,
  isBusy = false,
}) {
  const priority = getPriority(order.createdAt, now)

  return (
    <article
      id={cardId}
      className={cn(
        'w-full rounded-2xl border p-5 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.8)] transition-colors',
        priority === 'danger'
          ? 'border-rose-500/70 bg-rose-500/15'
          : priority === 'warning'
            ? 'border-amber-400/70 bg-amber-500/12'
            : 'border-slate-700/80 bg-slate-900/70',
        isNew && 'animate-pulse ring-2 ring-sky-300/60',
      )}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-slate-400">Order</p>
          <h3 className="mt-1 text-3xl font-semibold text-slate-50">#{order.ticketNo}</h3>
        </div>

        <StatusBadge status={order.status} />
      </header>

      <div className="space-y-2 text-base text-slate-200">
        <p>
          <span className="text-slate-400">Table:</span> {order.tableNo}
        </p>
        <p className="inline-flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-slate-500" />
          {order.serverName}
        </p>
        <p className="inline-flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-slate-500" />
          <TimeAgo timestamp={order.createdAt} now={now} />
        </p>
      </div>

      {priority === 'warning' ? (
        <p className="mt-3 inline-flex rounded-full bg-amber-500/20 px-3 py-1.5 text-sm font-semibold text-amber-200">
          Waiting 10+ minutes
        </p>
      ) : null}

      {priority === 'danger' ? (
        <p className="mt-3 inline-flex rounded-full bg-rose-500/20 px-3 py-1.5 text-sm font-semibold text-rose-200">
          Waiting 20+ minutes
        </p>
      ) : null}

      <ul className="mt-4 space-y-1 rounded-xl bg-slate-950/70 p-3 text-base text-slate-200">
        {(order.items || []).map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3">
            <span className="truncate">{item.name}</span>
            <span className="shrink-0 text-slate-400">x{item.qty}</span>
          </li>
        ))}
      </ul>

      <footer className="mt-4">
        {order.status === 'PENDING' ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onStartPreparing(order.id)}
            className="min-h-14 w-full rounded-xl bg-sky-500 px-4 py-3 text-lg font-semibold text-sky-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start Preparing
          </button>
        ) : null}

        {order.status === 'PREPARING' ? (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRequestMarkReady(order)}
            className="min-h-14 w-full rounded-xl bg-emerald-500 px-4 py-3 text-lg font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark as Ready
          </button>
        ) : null}

        {order.status === 'READY' ? (
          <div className="min-h-14 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4 text-center text-base font-semibold text-emerald-200">
            Ready for server pickup
          </div>
        ) : null}
      </footer>
    </article>
  )
})

function getPriority(createdAt, now) {
  if (!createdAt) return 'normal'
  const ageMinutes = Math.floor(((now || 0) - new Date(createdAt).getTime()) / 60000)
  if (ageMinutes >= 20) return 'danger'
  if (ageMinutes >= 10) return 'warning'
  return 'normal'
}

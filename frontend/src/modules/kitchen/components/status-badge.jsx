import { cn } from '../../../utils/cn'

const styles = {
  PENDING: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40',
  PREPARING: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/40',
  READY: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40',
}

export function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide',
        styles[status] || 'bg-slate-800 text-slate-200 ring-1 ring-slate-600',
        className,
      )}
    >
      {String(status || '').replaceAll('_', ' ')}
    </span>
  )
}

import { CloudArrowDownIcon, CloudIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import { cn } from '../../../utils/cn'

export function OfflineIndicator({ isOffline, isSyncing, queuedCount = 0 }) {
  const tone = isOffline ? 'bg-secondary-100 text-secondary-700' : 'bg-primary-100 text-primary-700'
  const icon = isOffline ? NoSymbolIcon : CloudIcon
  const Icon = isSyncing ? CloudArrowDownIcon : icon

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold',
        tone,
        isSyncing && 'bg-primary-200 text-primary-800',
      )}
      aria-live="polite"
    >
      <Icon className="h-4 w-4" />
      <span>{isOffline ? 'Offline Mode' : isSyncing ? 'Syncing...' : 'Online'}</span>
      {queuedCount > 0 && (
        <span className="rounded-full bg-white/70 px-2 py-0.5">{queuedCount}</span>
      )}
    </div>
  )
}

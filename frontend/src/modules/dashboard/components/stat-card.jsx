import { Card } from '../../../components/ui/card'
import { cn } from '../../../utils/cn'

export function StatCard({ title, value, change, trend = 'up', icon: Icon, accent = 'primary' }) {
  const StatIcon = Icon

  return (
    <Card className="rounded-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
          <p
            className={cn(
              'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
              trend === 'up'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-secondary-100 text-secondary-700',
            )}
          >
            {change}
          </p>
        </div>

        <span
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-2xl',
            accent === 'secondary'
              ? 'bg-secondary-100 text-secondary-600'
              : 'bg-primary-100 text-primary-700',
          )}
        >
          {StatIcon ? <StatIcon className="h-5 w-5" /> : null}
        </span>
      </div>
    </Card>
  )
}

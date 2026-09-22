import { Card } from '../../../components/ui/card'

export function InsightListCard({ title, subtitle, items, emptyText = 'No insights available' }) {
  return (
    <Card className="rounded-3xl">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-2xl border border-primary-100/70 bg-primary-50/60 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                {item.caption ? (
                  <p className="text-xs text-text-secondary">{item.caption}</p>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-primary-700">{item.value}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-text-secondary">{emptyText}</p>
        )}
      </div>
    </Card>
  )
}

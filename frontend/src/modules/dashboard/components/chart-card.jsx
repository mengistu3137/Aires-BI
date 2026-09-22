import { Card } from '../../../components/ui/card'

export function ChartCard({ title, subtitle, action, children, className = '' }) {
  return (
    <Card className={`rounded-3xl ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </header>
      {children}
    </Card>
  )
}

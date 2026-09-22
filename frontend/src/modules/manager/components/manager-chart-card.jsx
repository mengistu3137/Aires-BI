import { Card } from '../../../components/ui/card'

export function ManagerChartCard({ title, subtitle, children, className = '' }) {
  return (
    <Card className={`rounded-3xl ${className}`}>
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  )
}

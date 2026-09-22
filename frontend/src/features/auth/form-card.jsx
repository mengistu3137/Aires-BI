import { Card } from '../../components/ui/card'

export function FormCard({ title, subtitle, footer, children, className = '' }) {
  return (
    <Card className={`w-full p-6 shadow-soft-xl sm:p-8 ${className}`}>
      {title ? <h2 className="text-2xl font-semibold text-text-primary">{title}</h2> : null}
      {subtitle ? <p className="mt-1 text-sm text-text-secondary">{subtitle}</p> : null}

      <div className="mt-6">{children}</div>

      {footer ? <div className="mt-6 text-sm text-text-secondary">{footer}</div> : null}
    </Card>
  )
}

import { Card } from '../../../components/ui/card'

export function SuperAdminAnalyticsPage() {
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Analytics</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Advanced platform trends and KPI deep dives.
        </p>
      </header>

      <Card className="rounded-3xl border-primary-100/70 p-6">
        <p className="text-sm text-text-secondary">
          Analytics workspace is prepared and ready for the next iteration.
        </p>
      </Card>
    </div>
  )
}

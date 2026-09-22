import { Card } from '../../../components/ui/card'
import { PageContainer } from '../components/page-container'

export function ServerDashboardPage() {
  return (
    <PageContainer
      title="Server Dashboard"
      description="Quick view of your active work: open orders, ready pickups, and payment tracking."
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="My Open Orders" value="0" accent="primary" />
        <StatCard title="Ready for Pickup" value="0" accent="secondary" />
        <StatCard title="My Payments Today" value="ETB 0" accent="primary" />
        <StatCard title="Pending Deliveries" value="0" accent="secondary" />
      </section>

      <Card className="rounded-3xl border-primary-100/70 p-5">
        <h2 className="text-lg font-semibold text-text-primary">Welcome to Waiter Panel</h2>
        <p className="mt-2 text-sm text-text-secondary">
          This is the first step of the SERVER experience. Next, we can connect live waiter metrics
          and actions to backend APIs.
        </p>
      </Card>
    </PageContainer>
  )
}

function StatCard({ title, value, accent = 'primary' }) {
  return (
    <Card className="rounded-3xl border-primary-100/70 p-5">
      <p className="text-sm text-text-secondary">{title}</p>
      <p
        className={
          accent === 'secondary'
            ? 'mt-2 text-2xl font-semibold text-secondary-600'
            : 'mt-2 text-2xl font-semibold text-primary-700'
        }
      >
        {value}
      </p>
    </Card>
  )
}

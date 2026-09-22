import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Skeleton } from '../../../components/ui/skeleton'
import { superAdminService } from '../../../services/super-admin.service'
import { formatCurrency } from '../../../utils/format'

const DETAIL_TABS = [
  { key: 'OVERVIEW', label: 'Overview' },
  { key: 'USERS', label: 'Users' },
  { key: 'BRANCHES', label: 'Branches' },
  { key: 'ACTIVITY', label: 'Activity' },
]

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function SuperAdminOrganizationDetailsPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('OVERVIEW')

  const detailQuery = useQuery({
    queryKey: ['super-admin-organization-detail-page', id],
    queryFn: () => superAdminService.organizationDetails(id),
    enabled: Boolean(id),
    staleTime: 60_000,
  })

  const organization = detailQuery.data

  const activityRows = useMemo(() => {
    if (!organization?.activity) return []

    const paymentEvents = (organization.activity.payments || []).map((payment) => ({
      id: `payment-${payment.id}`,
      type: 'PAYMENT',
      createdAt: payment.createdAt,
      label: `Payment ${formatCurrency(payment.amount)} via ${payment.method}`,
      meta: `${payment.branch?.name || 'Unknown branch'} • ${payment.collector?.name || 'Unknown collector'}`,
      status: payment.status,
    }))

    const orderEvents = (organization.activity.orders || []).map((order) => ({
      id: `order-${order.id}`,
      type: 'ORDER',
      createdAt: order.createdAt,
      label: `Order ${formatCurrency(order.totalAmount)}`,
      meta: `${order.branch?.name || 'Unknown branch'} • payment ${order.paymentStatus}`,
      status: order.status,
    }))

    return paymentEvents
      .concat(orderEvents)
      .sort((a, b) => (new Date(a.createdAt) > new Date(b.createdAt) ? -1 : 1))
      .slice(0, 50)
  }, [organization])

  if (detailQuery.isLoading) {
    return <Skeleton className="h-96" />
  }

  if (detailQuery.isError || !organization) {
    return (
      <div className="grid gap-6">
        <header>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
            Organization Details
          </h1>
          <p className="mt-1 text-sm text-text-secondary">Unable to load organization details.</p>
        </header>

        <Card className="rounded-3xl border-secondary-200 bg-secondary-100 p-5">
          <p className="text-sm text-secondary-700">Failed to fetch organization details.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={() => detailQuery.refetch()}>
              Retry
            </Button>
            <Link to="/super-admin/organizations">
              <Button variant="ghost">Back to Organizations</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
            {organization.name}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Detailed organization profile and activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge value={organization.status || 'ACTIVE'} />
          <Link to="/super-admin/organizations">
            <Button variant="ghost">Back</Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Users" value={String(organization?._count?.users || 0)} />
        <SummaryCard title="Total Branches" value={String(organization?._count?.branches || 0)} />
        <SummaryCard title="Total Orders" value={String(organization?._count?.orders || 0)} />
        <SummaryCard
          title="Total Revenue"
          value={formatCurrency(Number(organization.totalRevenue || 0))}
        />
      </section>

      <Card className="rounded-3xl p-3">
        <nav className="flex flex-wrap gap-2">
          {DETAIL_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-primary-50 text-primary-700'
                  : 'bg-primary-50/70 text-text-secondary hover:bg-primary-100/60'
              }`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </Card>

      {activeTab === 'OVERVIEW' ? (
        <Card className="rounded-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Organization ID" value={organization.id} />
            <DetailItem label="Created" value={formatDate(organization.createdAt)} />
            <DetailItem label="Updated" value={formatDate(organization.updatedAt)} />
            <DetailItem label="Active Users" value={String(organization.activeUsers || 0)} />
            <DetailItem
              label="Kitchen Workflow"
              value={organization.hasKitchenFlow ? 'Enabled' : 'Disabled'}
            />
            <DetailItem
              label="Inventory"
              value={organization.hasInventory ? 'Enabled' : 'Disabled'}
            />
          </div>
        </Card>
      ) : null}

      {activeTab === 'USERS' ? (
        <Card className="overflow-hidden rounded-3xl p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary-100/70 text-sm">
              <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100/60 bg-surface">
                {(organization.users || []).map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium text-text-primary">{user.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{user.role}</td>
                    <td className="px-4 py-3">
                      <Badge value={user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
                {!organization.users?.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-secondary">
                      No users found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {activeTab === 'BRANCHES' ? (
        <Card className="overflow-hidden rounded-3xl p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary-100/70 text-sm">
              <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Branch</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100/60 bg-surface">
                {(organization.branches || []).map((branch) => (
                  <tr key={branch.id}>
                    <td className="px-4 py-3 font-medium text-text-primary">{branch.name}</td>
                    <td className="px-4 py-3">
                      <Badge value={branch.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {formatDate(branch.createdAt)}
                    </td>
                  </tr>
                ))}
                {!organization.branches?.length ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-text-secondary">
                      No branches found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {activeTab === 'ACTIVITY' ? (
        <Card className="overflow-hidden rounded-3xl p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-primary-100/70 text-sm">
              <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3 font-semibold">Meta</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100/60 bg-surface">
                {activityRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-text-primary">{row.type}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.label}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.meta}</td>
                    <td className="px-4 py-3 text-text-secondary">{row.status}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
                {!activityRows.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-secondary">
                      No activity found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  )
}

function SummaryCard({ title, value }) {
  return (
    <Card className="rounded-3xl">
      <p className="text-sm text-text-secondary">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
    </Card>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-primary-100/70 bg-primary-50/60 p-3">
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="mt-1 font-medium text-text-primary">{value || '-'}</p>
    </div>
  )
}

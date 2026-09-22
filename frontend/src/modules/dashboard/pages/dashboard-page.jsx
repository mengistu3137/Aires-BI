import {
  BanknotesIcon,
  ClipboardDocumentListIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '../../../components/shared/page-header'
import { Card } from '../../../components/ui/card'
import { ChartCard } from '../components/chart-card'
import { StatCard } from '../components/stat-card'

const stats = [
  {
    title: 'Total Sales',
    value: 'ETB 248,650',
    change: '+14.2% vs last week',
    trend: 'up',
    icon: BanknotesIcon,
    accent: 'primary',
  },
  {
    title: 'Orders Today',
    value: '186',
    change: '+8.6% vs yesterday',
    trend: 'up',
    icon: ClipboardDocumentListIcon,
    accent: 'secondary',
  },
  {
    title: 'Payments Recorded',
    value: '172',
    change: '-2 pending settlements',
    trend: 'down',
    icon: ShoppingBagIcon,
    accent: 'primary',
  },
]

const weeklySales = [
  { day: 'Mon', sales: 32000, orders: 22 },
  { day: 'Tue', sales: 28400, orders: 19 },
  { day: 'Wed', sales: 36800, orders: 28 },
  { day: 'Thu', sales: 34200, orders: 26 },
  { day: 'Fri', sales: 42900, orders: 34 },
  { day: 'Sat', sales: 48100, orders: 39 },
  { day: 'Sun', sales: 26250, orders: 18 },
]

const paymentMix = [
  { name: 'Cash', value: 36 },
  { name: 'Card', value: 41 },
  { name: 'Mobile Money', value: 23 },
]

const topProducts = [
  { name: 'Family Pizza Combo', sold: 62, revenue: 'ETB 43,400' },
  { name: 'Vanilla Cake Medium', sold: 48, revenue: 'ETB 26,880' },
  { name: 'Pain Relief Pack', sold: 39, revenue: 'ETB 19,300' },
  { name: 'Chicken Wrap', sold: 31, revenue: 'ETB 12,400' },
]

const branchSummary = [
  { branch: 'Bole Branch', status: 'Strong', statusColor: 'text-primary-700 bg-primary-50' },
  {
    branch: 'CMC Branch',
    status: 'Needs Attention',
    statusColor: 'text-secondary-700 bg-secondary-100',
  },
  { branch: 'Sarbet Branch', status: 'Strong', statusColor: 'text-primary-700 bg-primary-50' },
]

const PIE_COLORS = ['#1e5bff', '#ff7f11', '#93b1ff']

export function DashboardPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Dashboard"
        description="Performance overview across organizations, branches, and daily operations."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-5">
        <ChartCard
          title="Weekly Sales Trend"
          subtitle="Sales and order volume for the past 7 days"
          className="xl:col-span-3"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={weeklySales} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 30px -18px rgba(15, 23, 42, 0.35)',
                  }}
                />
                <Legend />
                <Bar name="Sales (ETB)" dataKey="sales" radius={[10, 10, 0, 0]} fill="#1e5bff" />
                <Bar name="Orders" dataKey="orders" radius={[10, 10, 0, 0]} fill="#ff7f11" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Payment Mix"
          subtitle="Distribution of payment channels"
          className="xl:col-span-2"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 30px -18px rgba(15, 23, 42, 0.35)',
                  }}
                />
                <Legend verticalAlign="bottom" height={26} />
                <Pie
                  data={paymentMix}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={86}
                  paddingAngle={4}
                >
                  {paymentMix.map((entry, index) => (
                    <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <header className="mb-4">
            <h3 className="text-base font-semibold text-text-primary">Top Products</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Best performing items by revenue contribution.
            </p>
          </header>
          <div className="space-y-3">
            {topProducts.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl border border-primary-100/70 bg-primary-50/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                  <p className="text-xs text-text-secondary">{item.sold} sold today</p>
                </div>
                <p className="text-sm font-semibold text-primary-700">{item.revenue}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-3xl">
          <header className="mb-4">
            <h3 className="text-base font-semibold text-text-primary">Branch Summary</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Quick status snapshot for active branches.
            </p>
          </header>
          <div className="space-y-3">
            {branchSummary.map((item) => (
              <div
                key={item.branch}
                className="flex items-center justify-between rounded-2xl border border-primary-100/70 bg-surface px-4 py-3"
              >
                <p className="text-sm font-medium text-text-primary">{item.branch}</p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${item.statusColor}`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}

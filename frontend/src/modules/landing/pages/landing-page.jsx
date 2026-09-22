import { Link } from 'react-router-dom'
import {
  BanknotesIcon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  Squares2X2Icon,
  UsersIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  CakeIcon,
  BeakerIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { Card } from '../../../components/ui/card'
import { FeatureCard } from '../components/feature-card'
import { LandingFooter } from '../components/landing-footer'
import { LandingNavbar } from '../components/landing-navbar'
import { SectionWrapper } from '../components/section-wrapper'

const features = [
  {
    icon: ClipboardDocumentListIcon,
    title: 'Order Management',
    description: 'Track every order from intake to completion with clean, role-based workflows.',
  },
  {
    icon: Squares2X2Icon,
    title: 'Kitchen Workflow',
    description:
      'Move tickets from pending to ready with a clear kitchen board and status visibility.',
  },
  {
    icon: BanknotesIcon,
    title: 'Payment Tracking',
    description: 'Capture cash, bank, and mobile payments with audit trails and receipt proof.',
  },
  {
    icon: UsersIcon,
    title: 'Employee Performance',
    description: 'See user productivity and sales impact per role, branch, and date range.',
  },
  {
    icon: BuildingStorefrontIcon,
    title: 'Multi-Branch Support',
    description: 'Manage multiple branches from one system with secure organization boundaries.',
  },
  {
    icon: DocumentChartBarIcon,
    title: 'Reports & Analytics',
    description: 'Convert daily operations into actionable dashboards for better decisions.',
  },
]

const targetUsers = [
  {
    icon: BuildingStorefrontIcon,
    title: 'Restaurants',
    description:
      'Coordinate servers, kitchen, and cashier workflows in one real-time operating hub.',
  },
  {
    icon: CakeIcon,
    title: 'Bakeries',
    description:
      'Track production flow, quick counter sales, and end-of-day revenue with less friction.',
  },
  {
    icon: BeakerIcon,
    title: 'Pharmacies',
    description:
      'Handle transaction-heavy operations while keeping auditability and staff accountability.',
  },
]

const steps = [
  'Create your organization and setup your first branch',
  'Add staff members and assign roles: server, cashier, chef',
  'Start managing orders, payments, and performance in one dashboard',
]

export function LandingPage() {
  return (
    <div id="top" className="min-h-screen bg-background text-text-primary">
      <LandingNavbar />

      <main>
        <HeroSection />

        <SectionWrapper
          id="features"
          title="Everything You Need To Run Faster"
          subtitle="Yemi brings operations, staff workflows, and reporting together so your team stays aligned."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </SectionWrapper>

        <SectionWrapper
          id="how-it-works"
          title="How It Works"
          subtitle="Onboard in minutes and move from manual operations to streamlined execution."
        >
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <Card key={step} className="rounded-2xl">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
                    {index + 1}
                  </span>
                  <p className="pt-0.5 text-sm text-text-secondary sm:text-base">{step}</p>
                </div>
              </Card>
            ))}
          </div>
        </SectionWrapper>

        <SectionWrapper
          id="target-users"
          title="Built for Real Business Teams"
          subtitle="Whether you serve meals, baked goods, or medicine, Yemi adapts to your operating model."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {targetUsers.map((item) => (
              <Card key={item.title} className="rounded-2xl">
                <item.icon className="h-6 w-6 text-secondary-600" />
                <h3 className="mt-4 text-lg font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{item.description}</p>
              </Card>
            ))}
          </div>
        </SectionWrapper>

        <SectionWrapper
          id="dashboard-preview"
          title="Preview the Yemi Dashboard"
          subtitle="Get instant visibility into orders, payments, and reports from one command center."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <PreviewCard title="Orders" value="184" trend="+12% today" accent="primary" />
            <PreviewCard
              title="Payments"
              value="ETB 248,000"
              trend="Cash 42% / Mobile 33%"
              accent="secondary"
            />
            <PreviewCard
              title="Reports"
              value="7 Insights"
              trend="Live daily analytics"
              accent="primary"
            />
          </div>
        </SectionWrapper>

        <SectionWrapper className="pb-20" id="cta">
          <Card className="rounded-2xl border-primary-200 bg-gradient-to-r from-primary-50 to-secondary-100/60 p-8 text-center shadow-soft-xl">
            <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">
              Start managing your business today
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-text-secondary sm:text-base">
              Join teams already using Yemi to run smoother operations across branches.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/register-organization"
                className="inline-flex items-center justify-center rounded-2xl bg-secondary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-secondary-600"
              >
                Register
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-primary-100/70 bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition hover:bg-primary-50/70"
              >
                Login
              </Link>
            </div>
          </Card>
        </SectionWrapper>
      </main>

      <LandingFooter />
    </div>
  )
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-primary-100/70 bg-surface">
      <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-primary-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 rounded-full bg-secondary-200/70 blur-3xl" />

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-600">
            Yemi SaaS
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-text-primary sm:text-5xl">
            Run Your Business Smarter with Yemi
          </h1>
          <p className="mt-4 max-w-xl text-sm text-text-secondary sm:text-base">
            POS + workflow + analytics built for restaurants, bakeries, and pharmacies that need
            speed, accountability, and clear visibility.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register-organization"
              className="inline-flex items-center justify-center rounded-2xl bg-secondary-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-secondary-600"
            >
              Start Free Trial
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-primary-100/70 bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition hover:bg-primary-50/70"
            >
              Login
            </Link>
          </div>
        </div>

        <Card className="rounded-2xl border-primary-100/70 p-5 shadow-soft-xl">
          <div className="flex items-center justify-between border-b border-primary-100/70 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-secondary">
                Live Dashboard Preview
              </p>
              <p className="mt-1 text-lg font-semibold text-text-primary">Yemi Console</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-100 px-2 py-1 text-xs font-semibold text-secondary-700">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Online
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <PreviewMini title="Orders In Queue" value="27" tone="primary" />
            <PreviewMini title="Payments Captured" value="ETB 84,320" tone="secondary" />
            <PreviewMini title="Active Staff" value="19" tone="primary" />
          </div>
        </Card>
      </div>
    </section>
  )
}

function PreviewMini({ title, value, tone = 'primary' }) {
  return (
    <div className="rounded-xl border border-primary-100/70 bg-primary-50/60 p-3">
      <p className="text-xs text-text-secondary">{title}</p>
      <p
        className={
          tone === 'secondary'
            ? 'mt-1 text-lg font-semibold text-secondary-600'
            : 'mt-1 text-lg font-semibold text-primary-700'
        }
      >
        {value}
      </p>
    </div>
  )
}

function PreviewCard({ title, value, trend, accent = 'primary' }) {
  return (
    <Card className="rounded-2xl">
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
      <p className="mt-2 text-sm text-text-secondary">{trend}</p>
    </Card>
  )
}

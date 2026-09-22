import { Link } from 'react-router-dom'
import Logo from '../../../components/Logo'
import { LoginForm } from '../../../features/auth/login-form'
import { FormCard } from '../../../features/auth/form-card'

export function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-secondary-200/50 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <section className="glass-panel p-6 sm:p-8">
          <Logo className="h-10 w-auto" />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-text-secondary">Yemi</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-text-primary sm:text-5xl">
            Run Your Business Smarter with Yemi
          </h1>
          <p className="mt-4 max-w-lg text-sm text-text-secondary sm:text-base">
            Manage your business operations in one place with POS, workflow automation, and
            analytics for restaurants, bakeries, and pharmacies.
          </p>
        </section>

        <FormCard
          title="Sign In"
          subtitle="Access your organization workspace."
          footer={
            <>
              Need an account?{' '}
              <Link className="font-semibold text-primary-700" to="/register-organization">
                Create account
              </Link>
            </>
          }
        >
          <LoginForm />
        </FormCard>
      </div>
    </div>
  )
}

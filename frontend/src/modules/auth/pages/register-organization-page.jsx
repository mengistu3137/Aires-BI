import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import Logo from '../../../components/Logo'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { FormCard } from '../../../features/auth/form-card'
import { useRegisterOrganization } from '../../../hooks/use-auth'

const registerSchema = z.object({
  orgName: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(80, 'Organization name is too long'),
  name: z.string().min(2, 'Admin name must be at least 2 characters').max(80, 'Name is too long'),
  email: z.string().email('Valid email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password is too long'),
})

export function RegisterOrganizationPage() {
  const registerOrganization = useRegisterOrganization()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      orgName: '',
      name: '',
      email: '',
      password: '',
    },
  })

  return (
    <div className="relative min-h-screen overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-secondary-200/50 blur-3xl" />

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl items-center gap-8 lg:grid-cols-2">
        <section className="glass-panel p-6 sm:p-8">
          <Logo className="h-10 w-auto" />
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-text-secondary">Yemi</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-text-primary sm:text-5xl">
            Launch your organization workspace in minutes
          </h1>
          <p className="mt-4 max-w-lg text-sm text-text-secondary sm:text-base">
            Create your tenant, onboard your admin account, and start managing operations with one
            unified platform.
          </p>
        </section>

        <FormCard
          title="Register Organization"
          subtitle="Create your workspace and admin account in under a minute."
          footer={
            <>
              Already have an account?{' '}
              <Link className="font-semibold text-primary-700" to="/login">
                Sign in
              </Link>
            </>
          }
        >
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            <span className="rounded-full bg-primary-100 px-2.5 py-1 text-primary-700">
              1. Organization
            </span>
            <span className="h-px flex-1 bg-primary-100/70" />
            <span className="rounded-full bg-primary-50 px-2.5 py-1 text-text-secondary">
              2. Admin
            </span>
          </div>

          <form
            className="grid gap-4"
            onSubmit={handleSubmit((values) =>
              registerOrganization.mutate({
                orgName: values.orgName.trim(),
                name: values.name.trim(),
                email: values.email.trim().toLowerCase(),
                password: values.password,
              }),
            )}
          >
            <div className="grid gap-4 rounded-2xl border border-primary-100/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Organization Info
              </p>
              <Input
                label="Organization Name"
                autoComplete="organization"
                placeholder="Yemi HQ"
                error={errors.orgName?.message}
                {...register('orgName')}
              />
            </div>

            <div className="grid gap-4 rounded-2xl border border-primary-100/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Admin User
              </p>
              <Input
                label="Name"
                autoComplete="name"
                placeholder="Abebe Kebede"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="admin@business.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            {registerOrganization.error?.message ? (
              <p className="rounded-xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm text-secondary-700">
                {registerOrganization.error.message}
              </p>
            ) : null}

            <Button type="submit" variant="secondary" isLoading={registerOrganization.isPending}>
              Create Organization
            </Button>
          </form>
        </FormCard>
      </div>
    </div>
  )
}

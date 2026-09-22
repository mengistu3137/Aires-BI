import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useLogin } from '../../hooks/use-auth'

const schema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export function LoginForm() {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  return (
    <form className="grid gap-4" onSubmit={handleSubmit((values) => login.mutate(values))}>
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      {login.error?.message ? (
        <p className="rounded-2xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm text-secondary-700">
          {login.error.message}
        </p>
      ) : null}

      <Button type="submit" isLoading={login.isPending}>
        Login
      </Button>
    </form>
  )
}

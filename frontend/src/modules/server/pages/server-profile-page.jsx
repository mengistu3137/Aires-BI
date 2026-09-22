import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { PageContainer } from '../components/page-container'
import { useAuthStore } from '../../../store/auth-store'
import { userProfileService } from '../../../services/user-profile.service'

const schema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    password: z
      .string()
      .optional()
      .transform((value) => value?.trim() || ''),
    confirmPassword: z
      .string()
      .optional()
      .transform((value) => value?.trim() || ''),
  })
  .superRefine((values, context) => {
    if (values.password && values.password.length < 6) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Password must be at least 6 characters',
      })
    }

    if (values.password && values.confirmPassword !== values.password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      })
    }
  })

export function ServerProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const updateUser = useAuthStore((state) => state.updateUser)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    reset({
      name: user?.name || '',
      password: '',
      confirmPassword: '',
    })
  }, [user?.name, reset])

  const updateProfile = useMutation({
    mutationFn: userProfileService.updateMe,
    onSuccess: (result, variables) => {
      const updatedUser = result?.user || result

      updateUser({
        ...updatedUser,
        name: updatedUser?.name || variables.name,
      })

      reset({
        name: updatedUser?.name || variables.name,
        password: '',
        confirmPassword: '',
      })

      toast.success('Profile updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update profile')
    },
  })

  const onSubmit = (values) => {
    const payload = {
      name: values.name.trim(),
    }

    if (values.password) {
      payload.password = values.password
    }

    updateProfile.mutate(payload)
  }

  const onLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <PageContainer title="Profile" description="Your waiter account details.">
      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-3xl border-primary-100/70 p-5">
          <h2 className="text-lg font-semibold text-text-primary">Profile Info</h2>
          <div className="mt-4 grid gap-2 text-sm text-text-secondary">
            <p>
              <span className="font-semibold text-text-primary">Name:</span> {user?.name || '-'}
            </p>
            <p>
              <span className="font-semibold text-text-primary">Email:</span> {user?.email || '-'}
            </p>
            <p>
              <span className="font-semibold text-text-primary">Role:</span>{' '}
              {user?.role || 'SERVER'}
            </p>
          </div>

          <div className="mt-5">
            <Button variant="ghost" className="gap-2" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl border-primary-100/70 p-5">
          <h2 className="text-lg font-semibold text-text-primary">Update Profile</h2>

          <form className="mt-4 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <Input label="Name" error={errors.name?.message} {...register('name')} />
            <Input
              label="New Password (Optional)"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <div className="pt-1">
              <Button type="submit" isLoading={updateProfile.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </PageContainer>
  )
}

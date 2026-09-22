import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema } from '../schemas/register.schema.js'
import { LocationFields } from '@/features/locations/components/LocationFields.jsx'
import { FormField } from '@/components/forms/FormField.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export const RegisterForm = ({ onSubmit, isLoading }) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      orgName: '',
      businessType: 'RESTAURANT',
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      countryId: '',
      regionId: '',
      cityId: '',
      address: '',
    },
  })

  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  const passwordsMatch = password === confirmPassword
  const passwordValid = password?.length >= 8

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Grid Pair 1: Org Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Organization Name" error={errors.orgName?.message}>
          <Input
            type="text"
            placeholder="e.g., ABC Restaurant Ltd"
            disabled={isLoading}
            {...register('orgName')}
          />
        </FormField>

        <FormField label="Business Type" error={errors.businessType?.message}>
          <Select
            options={[
              { value: 'RESTAURANT', label: 'Restaurant & Cafe' },
              { value: 'BAKERY', label: 'Bakery' },
              { value: 'PHARMACY', label: 'Pharmacy' },
              { value: 'SHOP', label: 'General Shop' },
            ]}
            disabled={isLoading}
            {...register('businessType')}
          />
        </FormField>
      </div>

      {/* Grid Pair 2: Admin Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Admin Full Name" error={errors.name?.message}>
          <Input
            type="text"
            placeholder="e.g., John Doe"
            disabled={isLoading}
            {...register('name')}
          />
        </FormField>

        <FormField label="Admin Email" error={errors.email?.message}>
          <Input
            type="email"
            placeholder="admin@example.com"
            disabled={isLoading}
            {...register('email')}
          />
        </FormField>
      </div>

      {/* Full width phone input */}
      <FormField label="Admin Phone Number" error={errors.phone?.message}>
        <Input type="tel" placeholder="+251911234567" disabled={isLoading} {...register('phone')} />
      </FormField>

      {/* Grid Pair 3: Passwords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Password" error={errors.password?.message}>
          <Input
            type="password"
            placeholder="At least 8 characters"
            disabled={isLoading}
            {...register('password')}
          />
          {password && password.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              {passwordValid ? (
                <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <XCircleIcon className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className="text-[10px] font-semibold text-text-secondary">
                {passwordValid ? 'Strong password' : 'Minimum 8 characters'}
              </span>
            </div>
          )}
        </FormField>

        <FormField label="Confirm Password" error="">
          <Input
            type="password"
            placeholder="Re-enter password"
            disabled={isLoading}
            {...register('confirmPassword')}
          />
          {confirmPassword && confirmPassword.length > 0 && (
            <div className="mt-1 flex items-center gap-1">
              {passwordsMatch ? (
                <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <XCircleIcon className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className="text-[10px] font-semibold text-text-secondary">
                {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
              </span>
            </div>
          )}
        </FormField>
      </div>

      {/* Location Fields */}
      <LocationFields
        register={register}
        errors={errors}
        disabled={isLoading}
        setValue={setValue}
        watch={watch}
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full py-3"
        disabled={isLoading || !passwordsMatch || !passwordValid}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Creating...
          </span>
        ) : (
          'Create Workspace'
        )}
      </Button>
    </form>
  )
}

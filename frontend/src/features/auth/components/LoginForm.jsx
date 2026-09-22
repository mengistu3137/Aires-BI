import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EyeIcon, EyeSlashIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline'

import { loginSchema } from '../schemas/login.schema.js'
import { FormField } from '@/components/forms/FormField.jsx'
import { Input } from '@/components/ui/Input.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { Spinner } from '@/components/ui/Spinner.jsx'

export const LoginForm = ({ onSubmit, isLoading }) => {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      {/* Email Field */}
      <FormField label="Email Address" error={errors.email?.message} className="space-y-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <EnvelopeIcon className="h-4 w-4 text-text-secondary" />
          </div>
          <Input
            type="email"
            placeholder="you@example.com"
            disabled={isLoading}
            className="pl-9 text-xs"
            {...register('email')}
          />
        </div>
      </FormField>

      {/* Password Field */}
      <FormField label="Password" error={errors.password?.message} className="space-y-1">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <KeyIcon className="h-4 w-4 text-text-secondary" />
          </div>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            disabled={isLoading}
            className="pl-9 pr-9 text-xs"
            {...register('password')}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-primary-500 transition-colors duration-200"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
          >
            {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </FormField>

      {/* Remember Me & Forgot Password */}
      <div className="flex items-center justify-between pt-0.5">
        <label className="flex items-center space-x-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-primary-200 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
          />
          <span className="text-xs text-text-secondary font-medium">Remember me</span>
        </label>
        <a
          href="#"
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors duration-200"
        >
          Forgot password?
        </a>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        variant="primary"
        className="w-full !py-2.5 text-xs font-bold shadow-sm transition-all duration-200"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner size="sm" className="border-white h-3.5 w-3.5" />
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  )
}
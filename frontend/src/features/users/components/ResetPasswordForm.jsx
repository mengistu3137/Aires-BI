import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { resetPasswordSchema } from '../schemas/user.schema.js'

// REUSE: Global Universal Components
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/Label.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

/**
 * Mobile-first administrative form used to reset a user's password.
 * Binds directly to the resetPasswordSchema to enforce matching validations.
 * Aggressively reuses custom global UI components with show/hide password toggles.
 */
export const ResetPasswordForm = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  // Independent toggle states for each credential input
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        
        {/* New Password Input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isLoading}
              className={`pr-10 ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              {...register('password')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-primary-500 transition-colors duration-200"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex="-1"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <span className="text-xs font-bold text-red-500">{errors.password.message}</span>
          )}
        </div>

        {/* Confirm New Password Input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isLoading}
              className={`pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-primary-500 transition-colors duration-200"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex="-1"
            >
              {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="text-xs font-bold text-red-500">{errors.confirmPassword.message}</span>
          )}
        </div>
      </div>

      {/* Action Buttons using standard UI Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-primary-100/40 pt-4 mt-1">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto h-11 py-0 text-sm flex items-center justify-center"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          className="w-full sm:w-auto h-11 py-0 text-sm flex items-center justify-center"
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            'Reset Password'
          )}
        </Button>
      </div>
    </form>
  )
}
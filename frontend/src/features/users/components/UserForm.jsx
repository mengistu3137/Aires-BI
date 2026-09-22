import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, updateUserSchema } from '../schemas/user.schema.js'

// REUSE: Global Universal Components
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/Label.jsx'
import { Select } from '@/components/ui/select.jsx'
import { Button } from '@/components/ui/Button.jsx'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

/**
 * Mobile-first adaptive form used for both creating and editing organization users.
 * Supports dynamic branches mapping and custom role keyrings selection [15].
 */
export const UserForm = ({
  mode = 'create', // 'create' | 'edit'
  defaultValues,
  branches = [],   // Array of { id, name } options
  roles = [],      // Array of dynamic system/custom { id, name, code } options
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [showPassword, setShowPassword] = React.useState(false)
  const isEditMode = mode === 'edit'
  
  // Resolve Zod validation schema dynamically based on edit/create mode [15]
  const schema = isEditMode ? updateUserSchema : createUserSchema

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {
      name: '',
      email: '',
      password: '',
      role: '',
      branchId: '',
    },
  })

  // Dynamic Role Option builder: fall back to static system defaults if array is empty [15]
  const roleOptions = roles && roles.length > 0
    ? [
        { value: '', label: 'Select Role...' },
        ...roles.map((r) => ({
          value: r.code, // Maps to the unique uppercase code (e.g. "KITCHEN_ASSISTANT") [15]
          label: r.name ? r.name.replace(/_/g, ' ') : 'Unnamed Role',
        })),
      ]
    : [
        { value: '', label: 'Select Role...' },
        { value: 'ADMIN', label: 'Administrator' },
        { value: 'MANAGER', label: 'Manager' },
        { value: 'CASHIER', label: 'Cashier Staff' },
        { value: 'CHEF', label: 'Kitchen Chef' },
        { value: 'SERVER', label: 'Table Server' },
        { value: 'STAFF', label: 'Standard Staff' }
      ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Full Name Input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Abebe Kebede"
            disabled={isLoading}
            className={errors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            {...register('name')}
          />
          {errors.name && (
            <span className="text-xs font-bold text-red-500">{errors.name.message}</span>
          )}
        </div>

        {/* Email Address Input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="abebe@milkiflow.com"
            disabled={isLoading}
            className={errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
            {...register('email')}
          />
          {errors.email && (
            <span className="text-xs font-bold text-red-500">{errors.email.message}</span>
          )}
        </div>

        {/* Password Input (Only mounted during creation mode) */}
        {!isEditMode && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="password">Initial Password</Label>
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
        )}

        {/* System & Custom Role Selection Dropdown (Binds to generated codes) */}
        <Select
          label="Workspace Role"
          error={errors.role?.message}
          disabled={isLoading}
          options={roleOptions}
          className="h-11 py-0"
          {...register('role')}
        />

        {/* Branch Assignment Dropdown */}
        <Select
          label="Branch Assignment"
          error={errors.branchId?.message}
          disabled={isLoading}
          options={[
            { value: '', label: 'Select Branch...' },
            ...branches.map((branch) => ({ value: branch.id, label: branch.name }))
          ]}
          className="h-11 py-0"
          {...register('branchId')}
        />
      </div>

      {/* Action Buttons using standard UI Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t border-primary-100/40 pt-4 mt-1">
        {onCancel && (
          <Button
            type="button"
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
          ) : isEditMode ? (
            'Save Changes'
          ) : (
            'Create User Account'
          )}
        </Button>
      </div>
    </form>
  )
}
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { selectOrganizationSchema } from '../schemas/selectOrganization.schema.js'
import { FormField } from '@/components/forms/FormField.jsx'
import { Select } from '@/components/ui/Select.jsx'
import { Button } from '@/components/ui/Button.jsx'

export const OrganizationSelector = ({ organizations = [], onSubmit, isLoading, onBack }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(selectOrganizationSchema),
  })

  const selectOptions = [
    { value: '', label: 'Select an Organization' },
    ...organizations.map((org) => ({ value: org.id, label: org.name })),
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormField label="Associated Workspaces" error={errors.organizationId?.message}>
        <Select options={selectOptions} disabled={isLoading} {...register('organizationId')} />
      </FormField>

      <div className="flex gap-3">
        <Button variant="outline" className="w-full py-2.5" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <Button type="submit" variant="primary" className="w-full py-2.5" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Enter Workspace'}
        </Button>
      </div>
    </form>
  )
}

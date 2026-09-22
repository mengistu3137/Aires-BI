import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useTenantStore } from '@/stores/tenant/tenant.store.js'

export const BusinessTypeRoute = ({ allowedTypes = [] }) => {
  const { branch } = useTenantStore()

  if (!branch) {
    return <Navigate to="/unauthorized" replace />
  }

  const hasAccess = allowedTypes.includes(branch.businessType)
  if (!hasAccess) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

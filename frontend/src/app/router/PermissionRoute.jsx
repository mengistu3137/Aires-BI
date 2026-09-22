import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions.js'
import { ForbiddenPage } from '@/components/feedback/ForbiddenPage.jsx'

export const PermissionRoute = ({ permission, children }) => {
  const { can } = usePermissions()
  const location = useLocation()

  // Debug: Log permission check

  if (!can(permission)) {
    return <ForbiddenPage />
  }

  return children
}

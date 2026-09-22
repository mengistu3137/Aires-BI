import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth/auth.store.js'

export const RoleRoute = ({ allowedRoles = [] }) => {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const hasRole = allowedRoles.includes(user.role)
  if (!hasRole) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}

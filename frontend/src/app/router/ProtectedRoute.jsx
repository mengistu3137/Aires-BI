import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth.js' // Consumes our updated custom hook [13]
import { PageLoader } from '@/components/feedback/PageLoader.jsx'

export const ProtectedRoute = () => {
  const { isInitialized, isAuthenticated, organizationSelectionRequired } = useAuth()

  // If restoring session from localStorage on boot, display the loading mask [11, 21]
  if (!isInitialized) {
    return <PageLoader />
  }

  // Redirect to login if user is unauthenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to organization selection if user has multiple workspaces [8]
  if (organizationSelectionRequired) {
    return <Navigate to="/select-organization" replace />
  }

  return <Outlet />
}

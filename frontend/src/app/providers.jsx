import { useEffect } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster as HotToaster } from 'react-hot-toast'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ErrorBoundary } from './error-boundary'
import { PwaInstallBanner } from './pwa-install-banner'
import { queryClient } from '../lib/query-client'
import { branchesService } from '../services/branches.service'
import { useAppStore } from '../store/app-store'
import { useAuthStore } from '../store/auth-store'
import { appRouter } from '../routes/app-router'

function AppBootstrap() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const branch = useAppStore((state) => state.branch)
  const setAppContext = useAppStore((state) => state.setAppContext)

  useEffect(() => {
    if (!isAuthenticated || !user?.branchId) return
    if (branch?.id === user.branchId) return

    let isMounted = true

    branchesService
      .getById(user.branchId)
      .then((nextBranch) => {
        if (!isMounted) return
        setAppContext({ user, branch: nextBranch })
      })
      .catch(() => {
        if (!isMounted) return
        setAppContext({ user, branch: branch || null })
      })

    return () => {
      isMounted = false
    }
  }, [branch, isAuthenticated, setAppContext, user])

  return null
}

export function AppProviders() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppBootstrap />
        <RouterProvider router={appRouter} />
        <PwaInstallBanner />
        <HotToaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

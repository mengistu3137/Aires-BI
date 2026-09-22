import { Bars3Icon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import Logo from '../../../components/Logo'
import { Button } from '../../../components/ui/button'
import { useAppStore } from '../../../store/app-store'
import { useAuthStore } from '../../../store/auth-store'
import { useUiStore } from '../../../store/ui-store'

export function Topbar() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const clearSession = useAuthStore((state) => state.clearSession)
  const branch = useAppStore((state) => state.branch)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  const onLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 lg:px-6">
      <div className="flex h-16 items-center justify-between rounded-2xl bg-surface/80 px-4 shadow-soft backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-100/70 text-text-secondary lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <Logo className="h-8 w-auto" />
            <div>
              <p className="text-xs uppercase tracking-wide text-text-secondary">Branch</p>
              <p className="text-sm font-semibold text-text-primary">
                {branch?.name || user?.branch?.name || 'Assigned Branch'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-text-primary">{user?.name || 'Server User'}</p>
            <p className="text-xs uppercase text-text-secondary">{user?.role || 'SERVER'}</p>
          </div>
          <Button variant="ghost" className="gap-2" onClick={onLogout}>
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}

import { useState, useRef, useEffect } from 'react'
import {
  Bars3Icon,
  ChevronDownIcon,
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
  BuildingOfficeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import Logo from '../../../components/Logo'
import { getBranchBusinessType, getBranchOperationMode } from '../../../lib/role-access'
import { useAppStore } from '../../../store/app-store'
import { useAuthStore } from '../../../store/auth-store'
import { useUiStore } from '../../../store/ui-store'
import { cn } from '../../../utils/cn'

export function Topbar() {
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const dropdownRef = useRef(null)

  const user = useAuthStore((state) => state.user)
  const role = useAuthStore((state) => state.role)
  const clearSession = useAuthStore((state) => state.clearSession)
  const branch = useAppStore((state) => state.branch)
  const organization = useAuthStore((state) => state.organization)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  console.log('User in Topbar:', user)
  console.log('Organization in Topbar:', organization)
  const mode = getBranchOperationMode(branch)
  const businessType = getBranchBusinessType(branch)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const onLogout = () => {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 lg:px-6">
      <div className="flex h-16 items-center justify-between rounded-2xl border border-white/20 bg-surface/80 px-4 shadow-soft backdrop-blur-md">
        {/* LEFT SECTION: Brand & Branch */}
        <div className="flex items-center gap-4">
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-primary-100/70 bg-white text-text-secondary transition-all hover:bg-primary-50 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-3 border-l-0 lg:border-l lg:pl-4 border-primary-100">
            <Logo className="hidden h-8 w-auto sm:block" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <BuildingOfficeIcon className="h-3 w-3 text-primary-500" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                  {organization?.organizationName || 'Yemi Org'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <MapPinIcon className="h-3.5 w-3.5 text-text-secondary" />
                <p className="text-sm font-semibold text-text-primary">
                  {branch?.name || 'Main Branch'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION: Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={cn(
              'flex items-center gap-3 rounded-xl p-1.5 transition-all hover:bg-primary-50',
              isProfileOpen ? 'bg-primary-50 ring-1 ring-primary-100' : '',
            )}
          >
            {/* User Info (Hidden on very small screens) */}
            <div className="hidden text-right sm:block pl-2">
              <p className="text-sm font-bold leading-none text-text-primary">
                {user?.name || 'Cashier User'}
              </p>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-tighter text-text-secondary">
                {role} • {mode}
              </p>
            </div>

            {/* Avatar Icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md">
              {user?.name ? (
                <span className="text-sm font-bold">{user.name.charAt(0)}</span>
              ) : (
                <UserCircleIcon className="h-6 w-6" />
              )}
            </div>

            <ChevronDownIcon
              className={cn(
                'h-4 w-4 text-text-secondary transition-transform duration-200',
                isProfileOpen ? 'rotate-180' : '',
              )}
            />
          </button>

          {/* DROPDOWN MENU */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-primary-100 bg-surface p-2 shadow-xl animate-in fade-in zoom-in duration-200">
              {/* Dropdown Header */}
              <div className="px-3 py-3 border-b border-primary-50">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Signed in as
                </p>
                <p className="text-sm font-bold text-text-primary truncate">
                  {user?.email || 'cashier@milkiflow.com'}
                </p>
                <div className="mt-2 inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                  {businessType || 'Retail'} Mode
                </div>
              </div>

              {/* Dropdown Links */}
              <div className="py-1">
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-primary-50 hover:text-primary-700"
                  onClick={() => {
                    /* Navigate to profile */ setIsProfileOpen(false)
                  }}
                >
                  <UserCircleIcon className="h-4 w-4" />
                  My Profile
                </button>
              </div>

              {/* Logout Action */}
              <div className="mt-1 border-t border-primary-50 pt-1">
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-error-600 transition-colors hover:bg-error-50"
                >
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

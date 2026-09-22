import { NavLink } from 'react-router-dom'
import {
  ClipboardDocumentListIcon,
  HomeIcon,
  PlusCircleIcon,
  BanknotesIcon,
  UserCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import Logo from '../../../components/Logo'
import { isPaymentsAccessAllowed } from '../../../lib/role-access'
import { useAppStore } from '../../../store/app-store'
import { useAuthStore } from '../../../store/auth-store'
import { useUiStore } from '../../../store/ui-store'
import { cn } from '../../../utils/cn'

const navItems = [
  { to: '/server/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/server/orders/create', label: 'Create Order', icon: PlusCircleIcon },
  { to: '/server/orders', label: 'My Orders', icon: ClipboardDocumentListIcon },
  { to: '/server/orders/ready', label: 'Ready Orders', icon: ClockIcon },
  { to: '/server/payments', label: 'My Payments', icon: BanknotesIcon },
  { to: '/server/profile', label: 'Profile', icon: UserCircleIcon },
]

export function Sidebar() {
  const isOpen = useUiStore((state) => state.isSidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)
  const role = useAuthStore((state) => state.role)
  const organization = useAppStore((state) => state.organization)
  const canAccessPayments = isPaymentsAccessAllowed(role, organization)
  const visibleItems = canAccessPayments
    ? navItems
    : navItems.filter((item) => item.to !== '/server/payments')

  return (
    <>
      <aside className="hidden lg:block lg:w-72 lg:flex-none">
        <div className="p-5">
          <Brand />
          <NavItems items={visibleItems} />
        </div>
      </aside>

      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-primary-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="h-full w-72 bg-background p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <Brand />
            <NavItems items={visibleItems} onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  )
}

function Brand() {
  return (
    <div className="glass-panel mb-8 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Logo className="h-9 w-auto" />
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Yemi</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">Waiter Panel</p>
        </div>
      </div>
    </div>
  )
}

function NavItems({ items, onNavigate }) {
  return (
    <nav className="space-y-1.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-text-secondary hover:bg-primary-50/60',
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

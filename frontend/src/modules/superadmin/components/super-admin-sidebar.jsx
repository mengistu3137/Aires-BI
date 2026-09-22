import { NavLink } from 'react-router-dom'
import {
  BuildingOffice2Icon,
  ClockIcon,
  ChartBarSquareIcon,
  Cog6ToothIcon,
  HomeIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import { useUiStore } from '../../../store/ui-store'
import { cn } from '../../../utils/cn'
import Logo from '../../../components/Logo'

const navItems = [
  { to: '/super-admin', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/super-admin/organizations', label: 'Organizations', icon: BuildingOffice2Icon },
  { to: '/super-admin/users', label: 'Users', icon: UsersIcon },
  { to: '/super-admin/activity', label: 'Activity', icon: ClockIcon },
  { to: '/super-admin/analytics', label: 'Analytics', icon: ChartBarSquareIcon },
  { to: '/super-admin/settings', label: 'System Settings', icon: Cog6ToothIcon },
]

export function SuperAdminSidebar() {
  const isOpen = useUiStore((state) => state.isSidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  return (
    <>
      <aside className="hidden border-r border-primary-100/70 bg-surface lg:block lg:w-72 lg:flex-none">
        <div className="p-5">
          <Brand />
          <SidebarNav />
        </div>
      </aside>

      {isOpen ? (
        <div
          className="fixed inset-0 z-40 bg-text-primary/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            className="h-full w-72 bg-surface p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <Brand />
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  )
}

function Brand() {
  return (
    <div className="glass-panel mb-8 flex flex-col gap-3 p-4">
      <Logo className="h-9 w-auto" />
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">MilkiFlow</p>
        <p className="mt-1 text-sm font-semibold text-text-primary">Super Admin</p>
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate }) {
  return (
    <nav className="space-y-1.5">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition',
              isActive
                ? 'bg-primary-50 text-primary-700'
                : 'text-text-secondary hover:bg-primary-50/70',
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

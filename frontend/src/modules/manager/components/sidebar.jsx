import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  ChartBarSquareIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline'
import { cn } from '../../../utils/cn'
import { useUiStore } from '../../../store/ui-store'
import Logo from '../../../components/Logo'

const navItems = [
  { to: '/manager', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/manager/orders', label: 'Orders Monitor', icon: ClipboardDocumentListIcon },
  { to: '/manager/payments', label: 'Payments', icon: BanknotesIcon },
  { to: '/manager/staff', label: 'Staff Performance', icon: ChartBarSquareIcon },
  { to: '/manager/reports', label: 'Reports', icon: PresentationChartLineIcon },
]

export function Sidebar() {
  const isOpen = useUiStore((state) => state.isSidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  return (
    <>
      <aside className="hidden border-r border-primary-100/70 bg-surface lg:block lg:w-72 lg:flex-none">
        <div className="p-5">
          <Brand />
          <NavItems />
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
            <NavItems onNavigate={() => setSidebarOpen(false)} />
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
        <p className="text-xs uppercase tracking-[0.2em] text-text-secondary">Yemi</p>
        <p className="mt-1 text-sm font-semibold text-text-primary">Manager Console</p>
      </div>
    </div>
  )
}

function NavItems({ onNavigate }) {
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

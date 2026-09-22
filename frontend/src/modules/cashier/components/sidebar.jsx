import { NavLink } from 'react-router-dom'
import {
  BanknotesIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline'
import { cn } from '../../../utils/cn'
import { useUiStore } from '../../../store/ui-store'
import Logo from '../../../components/Logo'

const navItems = [
  { to: '/cashier/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/cashier/record-payment', label: 'Record Payment', icon: BanknotesIcon },
  { to: '/cashier/my-payments', label: 'My Payments', icon: ClipboardDocumentListIcon },
  { to: '/cashier/daily-summary', label: 'Daily Summary', icon: RectangleGroupIcon },
]

import { XMarkIcon } from '@heroicons/react/24/outline' // Import the better icon

export function Sidebar() {
  const isOpen = useUiStore((state) => state.isSidebarOpen)
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen)

  return (
    <>
      {/* --- DESKTOP SIDEBAR (Unchanged) --- */}
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72 lg:flex-none border-r border-primary-100/70 bg-surface">
        <div className="flex h-full flex-col overflow-y-auto p-5 no-scrollbar">
          <Brand />
          <NavItems />
        </div>
      </aside>

      {/* --- MOBILE SIDEBAR (Drawer) --- */}
      <div
        className={cn(
          'fixed inset-0 z-50 transition-all duration-300 lg:hidden',
          isOpen ? 'visible' : 'invisible',
        )}
      >
        {/* Backdrop with blur */}
        <div
          className={cn(
            'absolute inset-0 bg-text-primary/20 backdrop-blur-sm transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar Panel */}
        <aside
          className={cn(
            'absolute inset-y-0 left-0 z-50 flex h-full w-80 flex-col bg-surface p-6 shadow-2xl transition-transform duration-500 ease-out',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          onClick={(event) => event.stopPropagation()}
        >
          {/* --- BEAUTIFUL CLOSE BUTTON --- */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute -right-12 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-text-primary shadow-lg ring-1 ring-black/5 backdrop-blur-md transition-transform active:scale-95 lg:hidden"
            aria-label="Close menu"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>

          {/* Sidebar Content */}
          <div className="flex h-full flex-col overflow-y-auto no-scrollbar">
            <div className="mb-8">
              <Brand />
            </div>

            <nav className="flex-1">
              <NavItems onNavigate={() => setSidebarOpen(false)} />
            </nav>

            {/* User Profile / Footer area at bottom of sidebar */}
            <div className="mt-auto border-t border-primary-50 pt-4">
              <p className="text-center text-[11px] font-medium tracking-widest text-text-secondary/40 uppercase">
                Yemi Dashboard
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

function Brand() {
  return (
    <div className="mb-8 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-primary-50 to-white p-6 shadow-sm border border-primary-100/50">
      <Logo className="h-12 w-12 mb-2" />
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary-600/60">Yemi</p>
        <p className="text-sm font-bold text-slate-800">Cashier Panel</p>
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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import Logo from '../../../components/Logo'
import { Button } from '../../../components/ui/button'
import { cn } from '../../../utils/cn'

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Industries', href: '#industries' },
  { label: 'Contact', href: '#footer' },
]

export function LandingNavbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between rounded-2xl bg-surface/80 px-4 shadow-soft backdrop-blur-md sm:px-6 lg:px-8">
        <a href="#top" className="inline-flex items-center gap-2">
          <Logo className="h-8 w-auto" />
          <span className="text-lg font-semibold text-text-primary">Yemi</span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-text-secondary hover:text-primary-600"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/register-organization">
            <Button variant="secondary">Start Free Trial</Button>
          </Link>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-100/70 text-text-secondary md:hidden"
          onClick={() => setIsOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {isOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          'mx-auto mt-3 w-full max-w-7xl rounded-2xl border border-primary-100/70 bg-surface/80 px-4 py-3 shadow-soft backdrop-blur md:hidden',
          isOpen ? 'block' : 'hidden',
        )}
      >
        <nav className="grid gap-2">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="rounded-2xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-primary-50/70"
            >
              {item.label}
            </a>
          ))}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Link to="/login" onClick={() => setIsOpen(false)}>
              <Button variant="ghost" className="w-full">
                Login
              </Button>
            </Link>
            <Link to="/register-organization" onClick={() => setIsOpen(false)}>
              <Button variant="secondary" className="w-full">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}

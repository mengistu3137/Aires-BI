import { NavLink } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { cn } from '../../../utils/cn'

const tabs = [
  { to: '/reports/sales', label: 'Sales Report' },
  { to: '/reports/payments', label: 'Payment Report' },
  { to: '/reports/employees', label: 'Employee Performance' },
]

export function ReportsToolbar({ title, description, draftRange, onRangeChange, onApply, action }) {
  return (
    <section className="grid gap-4 rounded-3xl border border-primary-100/70 bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
        {action || null}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'rounded-xl px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-text-secondary hover:bg-primary-50/70',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <Input
          label="Start Date"
          type="date"
          value={draftRange.startDate}
          onChange={(event) => onRangeChange({ ...draftRange, startDate: event.target.value })}
        />
        <Input
          label="End Date"
          type="date"
          value={draftRange.endDate}
          onChange={(event) => onRangeChange({ ...draftRange, endDate: event.target.value })}
        />
        <div className="flex items-end">
          <Button className="w-full" onClick={onApply}>
            Apply Filter
          </Button>
        </div>
      </div>
    </section>
  )
}

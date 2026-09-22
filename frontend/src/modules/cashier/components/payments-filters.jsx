import { Select } from '../../../components/ui/select'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'

const PERIOD_OPTIONS = [
  { label: 'Today', value: 'TODAY' },
  { label: 'This week', value: 'WEEK' },
  { label: 'Custom date range', value: 'CUSTOM' },
]

const METHOD_OPTIONS = [
  { label: 'All methods', value: 'ALL' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank', value: 'BANK' },
  { label: 'Mobile', value: 'MOBILE_MONEY' },
]

export function PaymentsFilters({ draftFilters, onDraftChange, onApply, isApplying = false }) {
  return (
    <section className="grid gap-3 rounded-2xl border border-primary-100/70 bg-primary-50/60 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Period"
          value={draftFilters.period}
          options={PERIOD_OPTIONS}
          onChange={(event) => onDraftChange({ period: event.target.value })}
        />

        <Select
          label="Method"
          value={draftFilters.method}
          options={METHOD_OPTIONS}
          onChange={(event) => onDraftChange({ method: event.target.value })}
        />

        <div className="flex items-end">
          <Button type="button" className="w-full" onClick={onApply} isLoading={isApplying}>
            Apply Filters
          </Button>
        </div>
      </div>

      {draftFilters.period === 'CUSTOM' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            value={draftFilters.startDate}
            onChange={(event) => onDraftChange({ startDate: event.target.value })}
          />
          <Input
            label="End Date"
            type="date"
            value={draftFilters.endDate}
            onChange={(event) => onDraftChange({ endDate: event.target.value })}
          />
        </div>
      ) : null}
    </section>
  )
}

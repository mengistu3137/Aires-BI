import { toast } from 'sonner'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { useSuperAdminStore } from '../super-admin.store'

const TIMEZONE_OPTIONS = [
  { label: 'Africa/Addis_Ababa', value: 'Africa/Addis_Ababa' },
  { label: 'UTC', value: 'UTC' },
  { label: 'Europe/London', value: 'Europe/London' },
]

const CURRENCY_OPTIONS = [
  { label: 'ETB', value: 'ETB' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
]

const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Amharic', value: 'am' },
]

export function SuperAdminSystemSettingsPage() {
  const settings = useSuperAdminStore((state) => state.settings)
  const setSetting = useSuperAdminStore((state) => state.setSetting)
  const resetSettings = useSuperAdminStore((state) => state.resetSettings)

  const onSave = () => {
    toast.success('Settings saved')
  }

  const onReset = () => {
    resetSettings()
    toast.success('Settings reset to defaults')
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">System Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Platform-wide controls and governance settings.
        </p>
      </header>

      <Card className="rounded-3xl border-primary-100/70 p-6">
        <h2 className="text-base font-semibold text-text-primary">Feature Toggles</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ToggleCard
            title="Kitchen Flow"
            description="Enable kitchen workflow features"
            checked={settings.kitchenFlowEnabled}
            onChange={(value) => setSetting('kitchenFlowEnabled', value)}
          />
          <ToggleCard
            title="Payments"
            description="Enable payment module and collection"
            checked={settings.paymentsEnabled}
            onChange={(value) => setSetting('paymentsEnabled', value)}
          />
          <ToggleCard
            title="Reports"
            description="Enable reporting and analytics access"
            checked={settings.reportsEnabled}
            onChange={(value) => setSetting('reportsEnabled', value)}
          />
        </div>
      </Card>

      <Card className="rounded-3xl border-primary-100/70 p-6">
        <h2 className="text-base font-semibold text-text-primary">Default Configurations</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Select
            label="Default Timezone"
            value={settings.defaultTimezone}
            options={TIMEZONE_OPTIONS}
            onChange={(event) => setSetting('defaultTimezone', event.target.value)}
          />
          <Select
            label="Default Currency"
            value={settings.defaultCurrency}
            options={CURRENCY_OPTIONS}
            onChange={(event) => setSetting('defaultCurrency', event.target.value)}
          />
          <Select
            label="Default Language"
            value={settings.defaultLanguage}
            options={LANGUAGE_OPTIONS}
            onChange={(event) => setSetting('defaultLanguage', event.target.value)}
          />
        </div>
      </Card>

      <Card className="rounded-3xl border-primary-100/70 p-6">
        <h2 className="text-base font-semibold text-text-primary">Limits (Future)</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input
            label="Max Organizations"
            type="number"
            min="1"
            value={settings.maxOrganizations}
            onChange={(event) => setSetting('maxOrganizations', Number(event.target.value || 0))}
          />
          <Input
            label="Max Users per Organization"
            type="number"
            min="1"
            value={settings.maxUsersPerOrganization}
            onChange={(event) =>
              setSetting('maxUsersPerOrganization', Number(event.target.value || 0))
            }
          />
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          These limits are currently informational and reserved for upcoming enforcement logic.
        </p>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={onReset}>
          Reset Defaults
        </Button>
        <Button onClick={onSave}>Save Settings</Button>
      </div>
    </div>
  )
}

function ToggleCard({ title, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-2xl border border-primary-100/70 bg-primary-50/50 p-4">
      <div>
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-xs text-text-secondary">{description}</p>
      </div>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 rounded border-primary-200 text-text-primary focus:ring-primary-300"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}

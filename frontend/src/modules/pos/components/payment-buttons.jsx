import {
  BanknotesIcon,
  DevicePhoneMobileIcon,
  CreditCardIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { Button } from '../../../components/ui/button'

export function PaymentButtons({ onPay, onCancel, isLoading }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionButton
        icon={BanknotesIcon}
        label="Cash"
        tone="bg-gradient-to-br from-primary-600 to-primary-500"
        onClick={() => onPay('CASH')}
        isLoading={isLoading}
      />
      <ActionButton
        icon={CreditCardIcon}
        label="Bank"
        tone="bg-gradient-to-br from-secondary-600 to-secondary-500"
        onClick={() => onPay('BANK')}
        isLoading={isLoading}
      />
      <ActionButton
        icon={DevicePhoneMobileIcon}
        label="Mobile Money"
        tone="bg-gradient-to-br from-primary-700 to-secondary-500 col-span-2"
        onClick={() => onPay('MOBILE_MONEY')}
        isLoading={isLoading}
      />
      <ActionButton
        icon={XMarkIcon}
        label="Cancel"
        tone="bg-gradient-to-br from-secondary-500 to-secondary-600 col-span-2"
        onClick={onCancel}
      />
    </div>
  )
}

function ActionButton({ icon: Icon, label, tone, onClick, isLoading }) {
  return (
    <Button
      type="button"
      size="lg"
      variant="ghost"
      isLoading={isLoading}
      onClick={onClick}
      className={`h-14 w-full justify-start gap-3 border border-transparent px-4 text-left text-white shadow-soft transition active:scale-[0.98] ${tone}`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-sm font-semibold">{label}</span>
    </Button>
  )
}

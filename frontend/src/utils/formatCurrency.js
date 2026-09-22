import { APP_CONSTANTS } from '../config/appConstants.js'

export const formatCurrency = (amount, currency = APP_CONSTANTS.CURRENCY_CODE) => {
  const numericAmount = parseFloat(amount)
  if (isNaN(numericAmount)) return `0.00 ${currency}`

  return `${numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`
}

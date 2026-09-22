export function formatCurrency(amount = 0) {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

export function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

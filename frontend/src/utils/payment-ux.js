const DUPLICATE_PAYMENT_PATTERN = /duplicate|already\s+paid|already\s+recorded|already\s+exists/i
const OVERPAYMENT_PATTERN = /overpay|exceed|remaining\s+balance|greater\s+than\s+remaining/i
const IMAGE_UPLOAD_PATTERN =
  /image|upload|file|multipart|payload\s+too\s+large|unsupported\s+media/i

const ALLOWED_RECEIPT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024

export function getPaymentErrorDetails(error) {
  const status = Number(error?.status || 0)
  const message = String(error?.message || 'Payment request failed').trim()

  if (!status) {
    return {
      type: 'network',
      message: 'Network issue detected. Check your connection and try again.',
    }
  }

  if (status === 409 || DUPLICATE_PAYMENT_PATTERN.test(message)) {
    return {
      type: 'duplicate',
      message: 'This payment looks like a duplicate and was not processed.',
    }
  }

  if ((status === 400 || status === 422) && OVERPAYMENT_PATTERN.test(message)) {
    return {
      type: 'overpayment',
      message: 'Payment exceeds the allowed balance for this order.',
    }
  }

  if ([400, 413, 415, 422].includes(status) && IMAGE_UPLOAD_PATTERN.test(message)) {
    return {
      type: 'upload',
      message: 'Receipt upload failed. Check image type/size and retry.',
    }
  }

  return {
    type: 'generic',
    message: message || 'Failed to record payment',
  }
}

export function validateReceiptFile(file) {
  if (!file) return ''

  if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
    return 'Receipt image must be JPG, PNG, or WEBP'
  }

  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    return 'Receipt image must be 5MB or smaller'
  }

  return ''
}

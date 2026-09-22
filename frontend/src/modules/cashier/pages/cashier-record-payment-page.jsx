import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { ImageUploadInput } from '../../../components/ui/image-upload-input'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { isPaymentsAccessAllowed } from '../../../lib/role-access'
import { ordersService } from '../../../services/orders.service'
import { paymentsService } from '../../../services/payments.service'
import { useAppStore } from '../../../store/app-store'
import { useAuthStore } from '../../../store/auth-store'
import { getPaymentErrorDetails, validateReceiptFile } from '../../../utils/payment-ux'
import { formatCurrency, formatDateTime } from '../../../utils/format'

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  method: z.enum(['CASH', 'BANK', 'MOBILE_MONEY']),
  orderId: z.string().trim().min(1, 'Order is required'),
  reference: z.string().trim().optional(),
})

const METHOD_OPTIONS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank', value: 'BANK' },
  { label: 'Mobile Money', value: 'MOBILE_MONEY' },
]

export function CashierRecordPaymentPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useAuthStore((state) => state.role)
  const organization = useAppStore((state) => state.organization)
  const canManagePayments = isPaymentsAccessAllowed(role, organization)
  const [searchOrderId, setSearchOrderId] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [amountError, setAmountError] = useState('')
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptError, setReceiptError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [retryPayload, setRetryPayload] = useState(null)
  const inFlightSignatureRef = useRef('')

  const unpaidOrdersQuery = useQuery({
    queryKey: ['cashier-unpaid-orders'],
    queryFn: () => ordersService.listUnpaid(),
    enabled: canManagePayments,
  })

  const {
    register,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      method: 'CASH',
      orderId: '',
      reference: '',
    },
  })

  const method = watch('method')
  const unpaidOrders = useMemo(() => {
    const rows = unpaidOrdersQuery.data?.items || unpaidOrdersQuery.data || []
    return Array.isArray(rows) ? rows : []
  }, [unpaidOrdersQuery.data])

  const searchedOrders = useMemo(() => {
    const needle = searchOrderId.trim().toLowerCase()
    if (!needle) return unpaidOrders

    return unpaidOrders.filter((order) => {
      const id = String(order?.id || '').toLowerCase()
      const customer = String(order?.customerName || '').toLowerCase()
      const table = String(order?.tableNo || '').toLowerCase()
      return id.includes(needle) || customer.includes(needle) || table.includes(needle)
    })
  }, [searchOrderId, unpaidOrders])

  const selectedOrder = useMemo(
    () => unpaidOrders.find((order) => order.id === selectedOrderId) || null,
    [selectedOrderId, unpaidOrders],
  )

  const orderTotal = Number(selectedOrder?.totalAmount || 0)

  const existingPaid = useMemo(() => {
    const payments = Array.isArray(selectedOrder?.payments) ? selectedOrder.payments : []
    return payments.reduce((sum, payment) => sum + (Number(payment?.amount) || 0), 0)
  }, [selectedOrder])

  const remainingAmount = useMemo(() => {
    const remaining = orderTotal - existingPaid
    return remaining > 0 ? remaining : 0
  }, [existingPaid, orderTotal])

  const isFullyPaidByStatus = selectedOrder?.paymentStatus === 'PAID'

  useEffect(() => {
    if (!selectedOrder) return
    setValue('orderId', selectedOrder.id, { shouldValidate: true })
    const initialAmount = existingPaid > 0 ? remainingAmount : orderTotal
    setValue('amount', Number(initialAmount.toFixed(2)), { shouldValidate: true })
    setAmountError('')
  }, [selectedOrder, existingPaid, remainingAmount, orderTotal, setValue])

  const createPayment = useMutation({
    mutationFn: (payload) => paymentsService.create(payload.formData),
    onSuccess: () => {
      toast.success('Payment recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['cashier-dashboard-payments'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-my-payments'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-daily-summary'] })
      queryClient.invalidateQueries({ queryKey: ['cashier-unpaid-orders'] })
      reset()
      setSearchOrderId('')
      setSelectedOrderId('')
      setAmountError('')
      setReceiptFile(null)
      setReceiptError('')
      setSubmitError('')
      setRetryPayload(null)
      inFlightSignatureRef.current = ''
      navigate('/cashier/my-payments', { replace: true })
    },
    onError: (error, variables) => {
      const details = getPaymentErrorDetails(error)

      if (details.type === 'overpayment') {
        setAmountError(details.message)
      }

      if (details.type === 'upload') {
        setReceiptError(details.message)
      }

      setSubmitError(details.message)
      setRetryPayload(variables)
      inFlightSignatureRef.current = ''
      toast.error(details.message)
    },
    onSettled: () => {
      inFlightSignatureRef.current = ''
    },
  })

  const modeText = useMemo(() => {
    return method === 'CASH'
      ? 'Receipt image is optional for cash payments.'
      : 'Receipt image is required for Bank and Mobile Money payments.'
  }, [method])

  const onSubmit = (values) => {
    if (createPayment.isPending) return

    if (!canManagePayments) {
      toast.error('You do not have permission to record payments in this mode')
      return
    }

    setAmountError('')
    setReceiptError('')
    setSubmitError('')

    if (!selectedOrder) {
      toast.error('Please select an unpaid order first')
      return
    }

    if (isFullyPaidByStatus || remainingAmount <= 0) {
      toast.error('Order is already fully paid')
      return
    }

    const amount = Number(values.amount || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      setAmountError('Amount must be greater than 0')
      return
    }

    if (amount > orderTotal + 0.01) {
      setAmountError(`Amount cannot exceed order total (${formatCurrency(orderTotal)})`)
      return
    }

    if (remainingAmount > 0 && amount > remainingAmount + 0.01) {
      setAmountError(`Amount cannot exceed remaining balance (${formatCurrency(remainingAmount)})`)
      return
    }

    if (values.method !== 'CASH' && !receiptFile) {
      setReceiptError('Receipt image is required for this payment method')
      return
    }

    const fileValidationError = validateReceiptFile(receiptFile)
    if (fileValidationError) {
      setReceiptError(fileValidationError)
      return
    }

    const signature = [
      selectedOrder.id,
      Number(values.amount || 0).toFixed(2),
      values.method,
      values.reference || '',
    ].join('|')

    if (inFlightSignatureRef.current === signature) {
      toast.error('Duplicate submission blocked. Please wait for the current request.')
      return
    }

    const formData = new FormData()
    formData.append('amount', String(values.amount))
    formData.append('method', values.method)
    formData.append('orderId', selectedOrder.id)
    if (values.reference) formData.append('reference', values.reference)
    if (receiptFile) {
      formData.append('image', receiptFile)
      formData.append('receiptImage', receiptFile)
    }

    const payload = {
      signature,
      formData,
    }

    inFlightSignatureRef.current = signature
    setRetryPayload(payload)
    createPayment.mutate(payload)
  }

  const onRetry = () => {
    if (!retryPayload || createPayment.isPending) return
    setSubmitError('')
    setAmountError('')
    setReceiptError('')
    inFlightSignatureRef.current = retryPayload.signature || ''
    createPayment.mutate(retryPayload)
  }

  const orderOptions = searchedOrders.map((order) => {
    const label = `#${String(order.id).slice(-6).toUpperCase()} • ${formatCurrency(order.totalAmount)} • ${order.status}`
    return { label, value: order.id }
  })

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Record Payment</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Capture payment details and attach receipt proof when needed.
        </p>
      </header>

      <Card className="rounded-3xl">
        {!canManagePayments ? (
          <p className="mb-4 rounded-xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm text-secondary-700">
            Payment recording is available for CASHIER, or SERVER only in Bakery/Pharmacy mode.
          </p>
        ) : null}

        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Search Order"
              placeholder="Order ID / customer / table"
              value={searchOrderId}
              onChange={(event) => setSearchOrderId(event.target.value)}
              disabled={!canManagePayments}
            />

            <Select
              label="Unpaid Orders"
              value={selectedOrderId}
              options={[{ label: 'Select unpaid order', value: '' }].concat(orderOptions)}
              onChange={(event) => setSelectedOrderId(event.target.value)}
              disabled={!canManagePayments}
            />
          </div>

          {unpaidOrdersQuery.isError ? (
            <div className="rounded-xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm text-secondary-700">
              <p>{unpaidOrdersQuery.error?.message || 'Failed to load unpaid orders'}</p>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => unpaidOrdersQuery.refetch()}
                  disabled={unpaidOrdersQuery.isFetching}
                >
                  Retry loading orders
                </Button>
              </div>
            </div>
          ) : null}

          {submitError ? (
            <div className="rounded-xl border border-secondary-200 bg-secondary-100 px-3 py-2 text-sm text-secondary-700">
              <p>{submitError}</p>
              <div className="mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  disabled={!retryPayload || createPayment.isPending}
                >
                  Retry payment
                </Button>
              </div>
            </div>
          ) : null}

          {selectedOrder ? (
            <Card className="rounded-2xl">
              <div className="grid gap-2 text-sm text-text-secondary">
                <p>
                  <span className="font-medium text-text-primary">Order:</span> #
                  {String(selectedOrder.id).slice(-6).toUpperCase()}
                </p>
                <p>
                  <span className="font-medium text-text-primary">Created:</span>{' '}
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
                <p>
                  <span className="font-medium text-text-primary">Status:</span>{' '}
                  {selectedOrder.status} / {selectedOrder.paymentStatus || 'PENDING'}
                </p>
                <p>
                  <span className="font-medium text-text-primary">Total:</span>{' '}
                  {formatCurrency(orderTotal)}
                </p>
                <p>
                  <span className="font-medium text-text-primary">Remaining:</span>{' '}
                  {formatCurrency(remainingAmount)}
                </p>
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Items
                </p>
                <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                  {(selectedOrder.items || []).map((item) => (
                    <li key={item.id || `${item.productId}-${item.quantity}`}>
                      {item.product?.name || item.name || 'Item'} x {item.quantity || 1}
                    </li>
                  ))}
                  {!selectedOrder.items?.length ? <li>No items available</li> : null}
                </ul>
              </div>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Amount"
              type="number"
              min="0"
              step="0.01"
              error={amountError || errors.amount?.message}
              disabled={!canManagePayments}
              {...register('amount')}
            />
            <Select
              label="Method"
              options={METHOD_OPTIONS}
              error={errors.method?.message}
              disabled={!canManagePayments}
              {...register('method')}
            />
            <Input
              label="Order ID"
              placeholder="Selected from unpaid orders"
              readOnly
              error={errors.orderId?.message}
              disabled={!canManagePayments}
              {...register('orderId')}
            />
            <Input
              label="Reference (Bank/Mobile)"
              placeholder="Txn / slip ref"
              disabled={!canManagePayments}
              {...register('reference')}
            />
          </div>

          <ImageUploadInput
            label="Receipt Image"
            file={receiptFile}
            error={receiptError}
            capture="environment"
            disabled={!canManagePayments}
            onFileChange={(file) => {
              if (!canManagePayments) return
              const validationError = validateReceiptFile(file)
              if (validationError) {
                setReceiptFile(null)
                setReceiptError(validationError)
                return
              }
              setReceiptFile(file)
              if (receiptError) setReceiptError('')
              if (submitError) setSubmitError('')
            }}
          />

          <p className="text-xs text-text-secondary">{modeText}</p>

          <div className="flex justify-end">
            <Button
              type="submit"
              className="min-w-36"
              isLoading={createPayment.isPending}
              disabled={!canManagePayments}
            >
              Record Payment
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

import { useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '../../../components/shared/page-header'
import { RoleGate } from '../../../components/shared/role-gate'
import { Card } from '../../../components/ui/card'
import { ImageUploadInput } from '../../../components/ui/image-upload-input'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Table } from '../../../components/ui/table'
import { Button } from '../../../components/ui/button'
import { ROUTE_ACCESS } from '../../../lib/role-access'
import { useAuthStore } from '../../../store/auth-store'
import { paymentsService } from '../../../services/payments.service'
import { getPaymentErrorDetails, validateReceiptFile } from '../../../utils/payment-ux'
import { formatCurrency, formatDateTime } from '../../../utils/format'

const schema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  method: z.enum(['CASH', 'BANK', 'MOBILE_MONEY']),
  orderId: z.string().trim().optional(),
  reference: z.string().trim().optional(),
})

const METHOD_OPTIONS = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank', value: 'BANK' },
  { label: 'Mobile', value: 'MOBILE_MONEY' },
]

export function PaymentsPage() {
  const queryClient = useQueryClient()
  const role = useAuthStore((state) => state.role)
  const [methodFilter, setMethodFilter] = useState('ALL')
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptError, setReceiptError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [retryPayload, setRetryPayload] = useState(null)
  const inFlightSignatureRef = useRef('')

  const {
    register,
    control,
    handleSubmit,
    reset,
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

  const selectedMethod = useWatch({
    control,
    name: 'method',
  })

  const historyParams = useMemo(
    () => ({
      ...(methodFilter !== 'ALL' ? { method: methodFilter } : {}),
    }),
    [methodFilter],
  )

  const { data: payments = [], isFetching: isLoadingPayments } = useQuery({
    queryKey: ['payments', role, historyParams],
    queryFn: () => paymentsService.listForRole(role, historyParams),
  })

  const createPayment = useMutation({
    mutationFn: (payload) => paymentsService.create(payload.formData),
    onSuccess: () => {
      toast.success('Payment recorded successfully')
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      reset()
      setReceiptFile(null)
      setReceiptError('')
      setAmountError('')
      setSubmitError('')
      setRetryPayload(null)
      inFlightSignatureRef.current = ''
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

  const summary = useMemo(() => {
    return payments.reduce(
      (acc, payment) => {
        acc.total += payment.amount || 0
        if (payment.method === 'CASH') acc.cash += payment.amount || 0
        if (payment.method === 'BANK') acc.bank += payment.amount || 0
        if (payment.method === 'MOBILE_MONEY') acc.mobile += payment.amount || 0
        acc.count += 1
        return acc
      },
      { total: 0, cash: 0, bank: 0, mobile: 0, count: 0 },
    )
  }, [payments])

  const onSubmit = (values) => {
    if (createPayment.isPending) return

    setReceiptError('')
    setAmountError('')
    setSubmitError('')

    const amount = Number(values.amount || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      setAmountError('Amount must be greater than 0')
      return
    }

    if (values.method !== 'CASH' && !receiptFile) {
      setReceiptError('Receipt image is required for Bank and Mobile payments')
      return
    }

    const fileValidationError = validateReceiptFile(receiptFile)
    if (fileValidationError) {
      setReceiptError(fileValidationError)
      return
    }

    const signature = [
      amount.toFixed(2),
      values.method,
      values.orderId || '',
      values.reference || '',
    ].join('|')

    if (inFlightSignatureRef.current === signature) {
      toast.error('Duplicate submission blocked. Please wait for the current request.')
      return
    }

    const formData = new FormData()
    formData.append('amount', String(values.amount))
    formData.append('method', values.method)
    if (values.orderId) formData.append('orderId', values.orderId)
    if (values.reference) formData.append('reference', values.reference)
    if (receiptFile) formData.append('image', receiptFile)

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

  const columns = [
    {
      key: 'createdAt',
      title: 'Date',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      key: 'collector',
      title: 'Collector',
      render: (row) => row.collector?.name || '-',
    },
    {
      key: 'method',
      title: 'Method',
      render: (row) => (
        <span className="inline-flex rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
          {row.method === 'MOBILE_MONEY' ? 'MOBILE' : row.method}
        </span>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (row) => (
        <span className="font-semibold text-primary-700">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'order',
      title: 'Order',
      render: (row) => (row.order?.id ? `#${row.order.id.slice(-6).toUpperCase()}` : '-'),
    },
    {
      key: 'reference',
      title: 'Reference',
      render: (row) => row.reference || '-',
    },
    {
      key: 'imageUrl',
      title: 'Receipt',
      render: (row) =>
        row.imageUrl ? (
          <a
            href={row.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-secondary-600 hover:text-secondary-700"
          >
            View
          </a>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payments"
        description="Record payments, attach receipts, and monitor transaction history."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Volume" value={formatCurrency(summary.total)} accent="primary" />
        <SummaryCard title="Cash" value={formatCurrency(summary.cash)} accent="secondary" />
        <SummaryCard title="Bank" value={formatCurrency(summary.bank)} accent="primary" />
        <SummaryCard title="Mobile" value={formatCurrency(summary.mobile)} accent="secondary" />
      </section>

      <RoleGate allowedRoles={ROUTE_ACCESS.PAYMENTS}>
        <Card className="rounded-3xl">
          <h2 className="text-lg font-semibold text-text-primary">Record Payment</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Create a payment and upload proof when required.
          </p>

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                error={amountError || errors.amount?.message}
                {...register('amount')}
              />

              <Select
                label="Method"
                options={METHOD_OPTIONS}
                error={errors.method?.message}
                {...register('method')}
              />

              <Input
                label="Order ID (Optional)"
                placeholder="cuid order id"
                {...register('orderId')}
              />

              <Input
                label="Reference (Optional)"
                placeholder="Bank slip / txn id"
                {...register('reference')}
              />
            </div>

            <ImageUploadInput
              label="Receipt Image"
              file={receiptFile}
              error={receiptError}
              onFileChange={(file) => {
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

            {selectedMethod === 'CASH' ? (
              <p className="text-xs text-text-secondary">Receipt is optional for cash payments.</p>
            ) : (
              <p className="text-xs text-text-secondary">
                Receipt is required for Bank and Mobile payments.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" className="min-w-36" isLoading={createPayment.isPending}>
                Record Payment
              </Button>
            </div>
          </form>
        </Card>
      </RoleGate>

      <Card className="rounded-3xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Payment History</h2>
            <p className="text-sm text-text-secondary">{summary.count} transactions</p>
          </div>

          <div className="w-full max-w-xs">
            <Select
              label="Filter by Method"
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value)}
              options={[{ label: 'All methods', value: 'ALL' }].concat(METHOD_OPTIONS)}
            />
          </div>
        </div>

        <Table
          columns={columns}
          rows={payments}
          isLoading={isLoadingPayments}
          loadingText="Loading payments..."
          emptyText="No payments found for this filter"
        />
      </Card>
    </div>
  )
}

function SummaryCard({ title, value, accent = 'primary' }) {
  return (
    <Card className="rounded-3xl">
      <p className="text-sm text-text-secondary">{title}</p>
      <p
        className={
          accent === 'secondary'
            ? 'mt-2 text-2xl font-semibold text-secondary-600'
            : 'mt-2 text-2xl font-semibold text-primary-700'
        }
      >
        {value}
      </p>
    </Card>
  )
}

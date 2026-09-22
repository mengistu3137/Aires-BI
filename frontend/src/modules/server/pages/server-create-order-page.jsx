import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { ordersService } from '../../../services/orders.service'
import { productsService } from '../../../services/products.service'
import { CartSidebar } from '../components/cart-sidebar'
import { PageContainer } from '../components/page-container'
import { ProductCard } from '../components/product-card'
import { useServerCartStore } from '../server-cart.store'

function normalizeProducts(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.products)) return data.products
  return []
}

function extractCategories(products) {
  const categoryMap = new Map()

  products.forEach((product) => {
    if (!product?.category?.id) return
    categoryMap.set(product.category.id, {
      value: product.category.id,
      label: product.category.name,
    })
  })

  return [{ value: 'ALL', label: 'All categories' }].concat(Array.from(categoryMap.values()))
}

export function ServerCreateOrderPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [type, setType] = useState('DINE_IN')
  const [tableNo, setTableNo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [submitError, setSubmitError] = useState('')

  const items = useServerCartStore((state) => state.items)
  const addItem = useServerCartStore((state) => state.addItem)
  const removeItem = useServerCartStore((state) => state.removeItem)
  const setQuantity = useServerCartStore((state) => state.setQuantity)
  const clearCart = useServerCartStore((state) => state.clearCart)

  const productsQuery = useQuery({
    queryKey: ['server-products'],
    queryFn: () => productsService.list(),
  })

  const createOrder = useMutation({
    mutationFn: ordersService.create,
    onSuccess: () => {
      toast.success('Order created successfully')
      clearCart()
      setTableNo('')
      setCustomerName('')
      setSubmitError('')
      navigate('/server/orders', { replace: true })
    },
    onError: (error) => {
      const message = error.message || 'Failed to create order'
      setSubmitError(message)
      toast.error(message)
    },
  })

  const products = useMemo(() => normalizeProducts(productsQuery.data), [productsQuery.data])

  const categoryOptions = useMemo(() => extractCategories(products), [products])

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase()

    return products.filter((product) => {
      if (category !== 'ALL' && product?.category?.id !== category) return false

      if (!term) return true

      const productName = product?.name?.toLowerCase() || ''
      const categoryName = product?.category?.name?.toLowerCase() || ''
      return productName.includes(term) || categoryName.includes(term)
    })
  }, [products, search, category])

  const total = useMemo(
    () =>
      items.reduce((sum, item) => {
        return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0)
      }, 0),
    [items],
  )

  const submit = () => {
    setSubmitError('')

    if (!items.length) {
      const message = 'Add at least one item to continue'
      setSubmitError(message)
      toast.error(message)
      return
    }

    const payload = {
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
      type,
      tableNo: tableNo.trim() || undefined,
      customerName: customerName.trim() || undefined,
    }

    createOrder.mutate(payload)
  }

  return (
    <PageContainer
      title="Create Order"
      description="Create a new customer order from the waiter panel."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section className="grid gap-4">
          <Card className="rounded-3xl border-primary-100/70 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Search"
                placeholder="Search products"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <Select
                label="Category"
                value={category}
                options={categoryOptions}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
          </Card>

          {productsQuery.isLoading ? (
            <Card className="rounded-3xl border-primary-100/70 p-5">
              <p className="text-sm text-text-secondary">Loading products...</p>
            </Card>
          ) : null}

          {productsQuery.isError ? (
            <Card className="rounded-3xl border-secondary-200 bg-secondary-50 p-5">
              <p className="text-sm text-secondary-700">
                {productsQuery.error?.message || 'Failed to load products'}
              </p>
            </Card>
          ) : null}

          {!productsQuery.isLoading && !productsQuery.isError ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} onAdd={addItem} />
                ))
              ) : (
                <Card className="rounded-3xl border-primary-100/70 p-5 sm:col-span-2 xl:col-span-3">
                  <p className="text-sm text-text-secondary">No products found for your filter.</p>
                </Card>
              )}
            </div>
          ) : null}
        </section>

        <CartSidebar
          items={items}
          total={total}
          orderType={type}
          tableNo={tableNo}
          customerName={customerName}
          isSubmitting={createOrder.isPending}
          submitError={submitError}
          onOrderTypeChange={(event) => setType(event.target.value)}
          onTableNoChange={(event) => setTableNo(event.target.value)}
          onCustomerNameChange={(event) => setCustomerName(event.target.value)}
          onQuantityChange={setQuantity}
          onRemove={removeItem}
          onClear={clearCart}
          onSubmit={submit}
        />
      </div>
    </PageContainer>
  )
}

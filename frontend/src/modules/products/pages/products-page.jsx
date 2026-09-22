import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PageHeader } from '../../../components/shared/page-header'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { ConfirmationModal } from '../../../components/ui/modal'
import { Select } from '../../../components/ui/select'
import { Table } from '../../../components/ui/table'
import { Input } from '../../../components/ui/input'
import { formatCurrency } from '../../../utils/format'
import { productsService } from '../../../services/products.service'
import { ProductFormModal } from '../components/product-form-modal'

export function ProductsPage({ initialModalMode = null, initialProductId = null }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isFormOpen, setIsFormOpen] = useState(Boolean(initialModalMode))
  const [formMode, setFormMode] = useState(initialModalMode === 'edit' ? 'edit' : 'create')
  const [selectedProductId, setSelectedProductId] = useState(initialProductId)
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  const listParams = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(isActiveFilter === 'all' ? {} : { isActive: isActiveFilter }),
    ...(categoryFilter === 'all' ? {} : { categoryId: categoryFilter }),
  }

  const { data: products = [], isFetching: isProductsLoading } = useQuery({
    queryKey: ['products', listParams],
    queryFn: () => productsService.list(listParams),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsService.listCategories(),
  })

  const createProduct = useMutation({
    mutationFn: productsService.create,
    onSuccess: () => {
      toast.success('Product created successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
      setSelectedProductId(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create product')
    },
  })

  const updateProduct = useMutation({
    mutationFn: ({ id, payload }) => productsService.update(id, payload),
    onSuccess: () => {
      toast.success('Product updated successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
      setSelectedProductId(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update product')
    },
  })

  const deleteProduct = useMutation({
    mutationFn: productsService.remove,
    onSuccess: () => {
      toast.success('Product deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDeleteCandidate(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product')
    },
  })

  const categoryOptions = useMemo(
    () =>
      [{ label: 'All categories', value: 'all' }].concat(
        categories.map((category) => ({ label: category.name, value: category.id })),
      ),
    [categories],
  )

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ||
    (initialProductId ? products.find((product) => product.id === initialProductId) : null)

  const onCreateClick = () => {
    setFormMode('create')
    setSelectedProductId(null)
    setIsFormOpen(true)
  }

  const onEditClick = (product) => {
    setFormMode('edit')
    setSelectedProductId(product.id)
    setIsFormOpen(true)
  }

  const onSubmitForm = (values) => {
    const payload = {
      name: values.name,
      price: values.price,
      sku: values.sku || undefined,
      type: values.type || undefined,
      categoryId: values.categoryId,
      ...(formMode === 'edit' ? { isActive: values.isActive } : {}),
    }

    if (formMode === 'edit' && selectedProductId) {
      updateProduct.mutate({ id: selectedProductId, payload })
      return
    }

    createProduct.mutate(payload)
  }

  const columns = [
    {
      key: 'name',
      title: 'Product',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.type || 'General'}</p>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (row) => row.category?.name || 'Uncategorized',
    },
    {
      key: 'price',
      title: 'Price',
      render: (row) => (
        <span className="font-semibold text-primary-700">{formatCurrency(row.price)}</span>
      ),
    },
    {
      key: 'sku',
      title: 'SKU',
      render: (row) => row.sku || '-',
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            row.isActive ? 'bg-primary-50 text-primary-700' : 'bg-secondary-100 text-secondary-700'
          }`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => onEditClick(row)}>
            <PencilSquareIcon className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="gap-1"
            onClick={() => setDeleteCandidate(row)}
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Products"
        description="Manage products and categories with streamlined create, edit, and catalog controls."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => navigate('/products/categories')}>
              Manage Categories
            </Button>
            <Button className="gap-2" onClick={onCreateClick}>
              <PlusIcon className="h-4 w-4" />
              New Product
            </Button>
          </div>
        }
      />

      <Card className="grid gap-4 rounded-3xl">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Search"
            placeholder="Search by product name"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <Select
            label="Status"
            value={isActiveFilter}
            onChange={(event) => setIsActiveFilter(event.target.value)}
            options={[
              { label: 'All statuses', value: 'all' },
              { label: 'Active', value: 'true' },
              { label: 'Inactive', value: 'false' },
            ]}
          />

          <Select
            label="Category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            options={categoryOptions}
          />
        </div>

        <Table
          columns={columns}
          rows={products}
          isLoading={isProductsLoading}
          emptyText="No products matched your search/filter criteria"
          loadingText="Loading products..."
        />
      </Card>

      <ProductFormModal
        isOpen={isFormOpen}
        mode={formMode}
        product={selectedProduct}
        categories={categories}
        isLoading={createProduct.isPending || updateProduct.isPending}
        submitError={createProduct.error?.message || updateProduct.error?.message || ''}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedProductId(null)
        }}
        onSubmit={onSubmitForm}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteCandidate)}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteCandidate?.name || 'this product'}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteProduct.isPending}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate?.id) {
            deleteProduct.mutate(deleteCandidate.id)
          }
        }}
      />
    </div>
  )
}

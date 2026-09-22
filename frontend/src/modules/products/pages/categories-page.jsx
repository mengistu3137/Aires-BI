import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { PageHeader } from '../../../components/shared/page-header'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Table } from '../../../components/ui/table'
import { ConfirmationModal } from '../../../components/ui/modal'
import { productsService } from '../../../services/products.service'
import { CategoryFormModal } from '../components/category-form-modal'

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isActiveFilter, setIsActiveFilter] = useState('all')
  const [formMode, setFormMode] = useState('create')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)

  const listParams = {
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(isActiveFilter === 'all' ? {} : { isActive: isActiveFilter }),
  }

  const { data: categories = [], isFetching: isLoading } = useQuery({
    queryKey: ['categories', listParams],
    queryFn: () => productsService.listCategories(listParams),
  })

  const createCategory = useMutation({
    mutationFn: productsService.createCategory,
    onSuccess: () => {
      toast.success('Category created successfully')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsFormOpen(false)
      setSelectedCategory(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create category')
    },
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, payload }) => productsService.updateCategory(id, payload),
    onSuccess: () => {
      toast.success('Category updated successfully')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsFormOpen(false)
      setSelectedCategory(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update category')
    },
  })

  const deleteCategory = useMutation({
    mutationFn: productsService.removeCategory,
    onSuccess: () => {
      toast.success('Category deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setDeleteCandidate(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete category')
    },
  })

  const onCreateClick = () => {
    setFormMode('create')
    setSelectedCategory(null)
    setIsFormOpen(true)
  }

  const onEditClick = (category) => {
    setFormMode('edit')
    setSelectedCategory(category)
    setIsFormOpen(true)
  }

  const onToggleActive = (category) => {
    updateCategory.mutate({
      id: category.id,
      payload: {
        isActive: !category.isActive,
      },
    })
  }

  const onSubmitForm = (values) => {
    const payload = {
      name: values.name,
      isActive: values.isActive,
    }

    if (formMode === 'edit' && selectedCategory?.id) {
      updateCategory.mutate({ id: selectedCategory.id, payload })
      return
    }

    createCategory.mutate(payload)
  }

  const columns = [
    {
      key: 'name',
      title: 'Category',
      render: (row) => <span className="font-semibold text-slate-900">{row.name}</span>,
    },
    {
      key: 'status',
      title: 'Status',
      render: (row) => (
        <button
          type="button"
          onClick={() => onToggleActive(row)}
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            row.isActive ? 'bg-primary-50 text-primary-700' : 'bg-secondary-100 text-secondary-700'
          }`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </button>
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
        title="Category Management"
        description="Create, update, activate, and retire categories used by your product catalog."
        action={
          <Button className="gap-2" onClick={onCreateClick}>
            <PlusIcon className="h-4 w-4" />
            New Category
          </Button>
        }
      />

      <Card className="grid gap-4 rounded-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Search"
            placeholder="Search by category name"
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
        </div>

        <Table
          columns={columns}
          rows={categories}
          isLoading={isLoading}
          emptyText="No categories matched your filters"
          loadingText="Loading categories..."
        />
      </Card>

      <CategoryFormModal
        isOpen={isFormOpen}
        mode={formMode}
        category={selectedCategory}
        isLoading={createCategory.isPending || updateCategory.isPending}
        submitError={createCategory.error?.message || updateCategory.error?.message || ''}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedCategory(null)
        }}
        onSubmit={onSubmitForm}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteCandidate)}
        title="Delete Category"
        description={`Are you sure you want to delete "${deleteCandidate?.name || 'this category'}"? Categories linked to products cannot be deleted.`}
        confirmText="Delete"
        isLoading={deleteCategory.isPending}
        onClose={() => setDeleteCandidate(null)}
        onConfirm={() => {
          if (deleteCandidate?.id) {
            deleteCategory.mutate(deleteCandidate.id)
          }
        }}
      />
    </div>
  )
}

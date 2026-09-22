import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { ConfirmationModal } from '../../../components/ui/modal'
import { Skeleton } from '../../../components/ui/skeleton'
import { superAdminService } from '../../../services/super-admin.service'
import { useSuperAdminStore } from '../super-admin.store'

const PAGE_SIZE = 10

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date)
}

export function SuperAdminOrganizationsPage() {
  const navigate = useNavigate()
  const organizationSearch = useSuperAdminStore((state) => state.organizationSearch)
  const setOrganizationSearch = useSuperAdminStore((state) => state.setOrganizationSearch)
  const [page, setPage] = useState(1)
  const [statusActionTarget, setStatusActionTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const queryClient = useQueryClient()

  const organizationsQuery = useQuery({
    queryKey: ['super-admin-organizations', organizationSearch, page, PAGE_SIZE],
    queryFn: () =>
      superAdminService.organizations({
        search: organizationSearch,
        page,
        limit: PAGE_SIZE,
      }),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  })

  const statusMutation = useMutation({
    mutationFn: ({ organizationId, isActive }) =>
      superAdminService.setOrganizationStatus(organizationId, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] })
      toast.success(variables.isActive ? 'Organization enabled' : 'Organization disabled')
      setStatusActionTarget(null)
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update organization status')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (organizationId) => superAdminService.softDeleteOrganization(organizationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] })
      setDeleteTarget(null)
      toast.success('Organization soft deleted')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete organization')
    },
  })

  const rows = organizationsQuery.data?.rows || []
  const pagination = organizationsQuery.data?.pagination

  const totalPages = pagination?.totalPages || 1
  const currentPage = pagination?.page || page

  const statusRows = useMemo(
    () =>
      rows.map((org) => ({
        ...org,
        status: org.status || (org.deletedAt ? 'INACTIVE' : 'ACTIVE'),
      })),
    [rows],
  )

  const onSearchChange = (value) => {
    setPage(1)
    setOrganizationSearch(value)
  }

  if (organizationsQuery.isLoading) {
    return <Skeleton className="h-80" />
  }

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">Organizations</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Platform organizations and tenant footprint.
        </p>
      </header>

      <Card className="rounded-3xl">
        <label className="grid gap-1.5 text-sm text-text-secondary">
          <span className="font-medium">Search by Name</span>
          <input
            value={organizationSearch}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Type organization name"
            className="h-11 w-full rounded-2xl border border-primary-100/70 bg-surface px-3 text-sm text-text-primary outline-none transition placeholder:text-text-secondary/70 focus:ring-2 focus:ring-primary-500"
          />
        </label>
      </Card>

      <Card className="overflow-hidden rounded-3xl p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary-100/70 text-sm">
            <thead className="bg-primary-50 text-left text-xs uppercase tracking-wide text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Organization</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Users</th>
                <th className="px-4 py-3 font-semibold">Branches</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100/60 bg-surface">
              {statusRows.map((org) => (
                <tr key={org.id} className="hover:bg-primary-50/70">
                  <td className="px-4 py-3 font-medium text-text-primary">
                    {org.name || 'Unknown org'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatDate(org.createdAt)}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {org.activeUsers ?? org?._count?.users ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{org?._count?.branches ?? '-'}</td>
                  <td className="px-4 py-3">
                    <Badge value={org.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/super-admin/organizations/${org.id}`)}
                      >
                        View details
                      </Button>
                      <Button
                        variant={org.status === 'ACTIVE' ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => setStatusActionTarget(org)}
                      >
                        {org.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteTarget(org)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!statusRows.length ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-secondary">
                    No organizations found for this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-primary-100/70 bg-primary-50 px-4 py-3">
          <p className="text-sm text-text-secondary">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmationModal
        isOpen={Boolean(statusActionTarget)}
        title={`${statusActionTarget?.status === 'ACTIVE' ? 'Disable' : 'Enable'} Organization`}
        description={`Are you sure you want to ${statusActionTarget?.status === 'ACTIVE' ? 'disable' : 'enable'} ${statusActionTarget?.name || 'this organization'}?`}
        confirmText={statusActionTarget?.status === 'ACTIVE' ? 'Disable' : 'Enable'}
        isLoading={statusMutation.isPending}
        onClose={() => setStatusActionTarget(null)}
        onConfirm={() => {
          if (!statusActionTarget?.id) return
          statusMutation.mutate({
            organizationId: statusActionTarget.id,
            isActive: statusActionTarget.status !== 'ACTIVE',
          })
        }}
      />

      <ConfirmationModal
        isOpen={Boolean(deleteTarget)}
        title="Soft Delete Organization"
        description={`This will mark ${deleteTarget?.name || 'this organization'} as inactive (soft delete). You can enable it later.`}
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget?.id) return
          deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </div>
  )
}

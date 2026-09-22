import { Card } from '../../../components/ui/card'
import { PageHeader } from '../../../components/shared/page-header'

export function UsersPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Users"
        description="Manage user accounts and role-based access by organization and branch."
      />
      <Card>
        <p className="text-sm text-slate-600">
          User role management module is scaffolded for ADMIN, MANAGER, CASHIER, SERVER, and CHEF
          workflows.
        </p>
      </Card>
    </div>
  )
}

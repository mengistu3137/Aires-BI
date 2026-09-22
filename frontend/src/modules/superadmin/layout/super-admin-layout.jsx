import { Outlet } from 'react-router-dom'
import { SuperAdminSidebar } from '../components/super-admin-sidebar'
import { SuperAdminTopbar } from '../components/super-admin-topbar'

export function SuperAdminLayout() {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <SuperAdminSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <SuperAdminTopbar />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

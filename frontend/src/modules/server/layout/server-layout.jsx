import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/sidebar'
import { Topbar } from '../components/topbar'

export function ServerLayout() {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

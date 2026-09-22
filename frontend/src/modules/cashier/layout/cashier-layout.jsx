import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/sidebar'
import { Topbar } from '../components/topbar'

// CashierLayout.jsx
export function CashierLayout() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar is sticky and has h-screen internally */}
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Topbar />

        {/* Main content can be as long as needed */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

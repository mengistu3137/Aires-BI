// 1. React Built-ins
import React from 'react'

// 2. Third-Party Packages (Alphabetized)
// (None required directly here)

// 3. Absolute Alias Imports (@/*) (Alphabetized)
import { ForbiddenPage } from '@/components/feedback/ForbiddenPage.jsx'
import { NotFoundPage } from '@/components/feedback/NotFoundPage.jsx'
import { AuthLayout } from '@/components/layouts/AuthLayout.jsx'
import { DashboardLayout } from '@/components/layouts/DashboardLayout.jsx'
import { KitchenLayout } from '@/components/layouts/KitchenLayout.jsx'
import { LoginPage } from '@/features/auth/pages/LoginPage.jsx'
import { RegisterPage } from '@/features/auth/pages/RegisterPage.jsx'
import { SelectOrganizationPage } from '@/features/auth/pages/SelectOrganizationPage.jsx'
import { BillingPage } from '@/features/billing/pages/BillingPage.jsx'
import { PendingPaymentsPage } from '@/features/billing/pages/PendingPaymentsPage.jsx'
import { TrialsPage } from '@/features/billing/pages/TrialsPage.jsx'
import { BranchDetailsPage } from '@/features/branches/pages/BranchDetailsPage.jsx'
import { BranchListPage } from '@/features/branches/pages/BranchListPage.jsx'
import { StockPage } from '@/features/inventory/pages/StockPage.jsx'
import { BatchesPage } from '@/features/inventory/pages/BatchesPage.jsx'
import { ExpiringPage } from '@/features/inventory/pages/ExpiringPage.jsx'
import { LowStockPage } from '@/features/inventory/pages/LowStockPage.jsx'
import { MovementsPage } from '@/features/inventory/pages/MovementsPage.jsx'
import { InventoryPage } from '@/features/inventory/pages/InventoryPage.jsx'
import { OrganizationDetailsPage } from '@/features/organizations/pages/OrganizationDetailsPage.jsx'
import { OrganizationListPage } from '@/features/organizations/pages/OrganizationListPage.jsx'
import { OrganizationSettingsPage } from '@/features/organizations/pages/OrganizationSettingsPage.jsx'
import { AvailablePlansPage } from '@/features/plans/pages/AvailablePlansPage.jsx'
import { FeaturesPage } from '@/features/plans/pages/FeaturesPage.jsx'
import { PlansPage } from '@/features/plans/pages/PlansPage.jsx'
import PaymentProofUploadPage from '@/features/pos/pages/PaymentProofUploadPage.jsx'
import { PosPage } from '@/features/pos/pages/PosPage.jsx'
import { CatalogPage } from '@/features/products/pages/CatalogPage.jsx'
import { ReceiptPage } from '@/features/receipts/pages/ReceiptPage.jsx'
import { ReportsPage } from '@/features/reports/pages/ReportsPage.jsx'
import { SalesPage } from '@/features/sales/pages/SalesPage.jsx'
import { SuperAdminDashboard } from '@/features/super-admin/pages/SuperAdminDashboard.jsx'
import { UserManagementPage } from '@/features/users/pages/UsersPage.jsx'

// Orders
import { OrdersPage } from '@/features/orders/pages/OrdersPage.jsx'
import { ReadyOrdersPage } from '@/features/orders/pages/ReadyOrdersPage.jsx'
import { UnpaidOrdersPage } from '@/features/orders/pages/UnpaidOrdersPage.jsx'
import { MyOrdersPage } from '@/features/orders/pages/MyOrdersPage.jsx'
import { PendingChangeRequestsPage } from '@/features/orders/pages/PendingChangeRequestsPage.jsx'

import { CashierLayout } from '@/components/layouts/CashierLayout.jsx'
import { CashierOrdersPage } from '@/features/cashier/pages/CashierOrdersPage.jsx'
import { CashierOrderDetailPage } from '@/features/cashier/pages/CashierOrderDetailPage.jsx'
import { CashierMorePage } from '@/features/cashier/pages/CashierMorePage.jsx'

// 4. Relative Imports (Alphabetized)
import { FeatureRoute } from './FeatureRoute.jsx'
import { PermissionRoute } from './PermissionRoute.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { RoleRoute } from './RoleRoute.jsx'
import { ServerLayout } from '@/components/layouts/ServerLayout.jsx'
import { BusinessTypeRoute } from './BusinessTypeRoute.jsx'
import { ServerOrdersPage } from '@/features/server/pages/ServerOrdersPage.jsx'
import { ServerNewOrderPage } from '@/features/server/pages/ServerNewOrderPage.jsx'
import { Navigate } from 'react-router-dom'
import { ServerOrderReviewPage } from '@/features/server/pages/ServerOrderReviewPage.jsx'
import { ServerMorePage } from '@/features/server/pages/ServerMorePage.jsx'

import { ServerHistoryPage } from '@/features/server/pages/ServerHistoryPage.jsx'
import { KitchenPage } from '@/features/kitchen/pages/KitchenPage.jsx'

import { useTenant } from '@/hooks/useTenant.js'

import { ShellWrapper } from '@/components/layouts/ShellWrapper.jsx'

const CashierIndexRedirect = () => {
  const { hasKitchenFlow } = useTenant()
  return <Navigate to={hasKitchenFlow ? '/cashier/orders' : '/cashier/pos'} replace />
}
// Mock views for placeholder pages
const MockDashboard = () => <div className="section-title">Dashboard Foundation Active</div>
const MockKDS = () => <div className="section-title">Kitchen ticketing queue view</div>

export const routes = [
  // ---------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'select-organization', element: <SelectOrganizationPage /> },
    ],
  },

  // ---------------------------------------------------------------
  // PROTECTED APP SHELL
  // ---------------------------------------------------------------
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <ShellWrapper />,
        children: [
          // ---- Backoffice workspace (desktop-first) ----
          {
            path: '/',
            element: <DashboardLayout />,
            children: [
              { path: 'dashboard', element: <MockDashboard /> },

              // Users
              {
                element: <RoleRoute allowedRoles={['ADMIN', 'MANAGER']} />,
                children: [{ path: 'user-management', element: <UserManagementPage /> }],
              },

              // Catalog
              {
                path: 'products',
                element: (
                  <PermissionRoute permission="product.read">
                    <CatalogPage />
                  </PermissionRoute>
                ),
              },

              // Inventory
              // {
              //   path: 'inventory',
              //   element: (
              //     <FeatureRoute feature="INVENTORY">
              //       <PermissionRoute permission="inventory.read">
              //         <InventoryPage />
              //       </PermissionRoute>
              //     </FeatureRoute>
              //   ),
              // },

              { path: 'inventory', element: <Navigate to="/inventory/stock" replace /> },

              {
                path: 'inventory/stock',
                element: (
                  <FeatureRoute feature="INVENTORY">
                    <PermissionRoute permission="inventory.read">
                      <StockPage />
                    </PermissionRoute>
                  </FeatureRoute>
                ),
              },
              {
                path: 'inventory/batches',
                element: (
                  <FeatureRoute feature="INVENTORY">
                    <PermissionRoute permission="inventory.expiry.read">
                      <BatchesPage />
                    </PermissionRoute>
                  </FeatureRoute>
                ),
              },
              {
                path: 'inventory/low-stock',
                element: (
                  <FeatureRoute feature="INVENTORY">
                    <PermissionRoute permission="inventory.read">
                      <LowStockPage />
                    </PermissionRoute>
                  </FeatureRoute>
                ),
              },
              {
                path: 'inventory/expiring',
                element: (
                  <FeatureRoute feature="INVENTORY">
                    <PermissionRoute permission="inventory.expiry.read">
                      <ExpiringPage />
                    </PermissionRoute>
                  </FeatureRoute>
                ),
              },
              {
                path: 'inventory/movements',
                element: (
                  <FeatureRoute feature="INVENTORY">
                    <PermissionRoute permission="inventory.read">
                      <MovementsPage />
                    </PermissionRoute>
                  </FeatureRoute>
                ),
              },

              // Reports
              {
                path: 'reports',
                element: (
                  <PermissionRoute permission="report.read">
                    <ReportsPage />
                  </PermissionRoute>
                ),
              },

              // Sales Ledger
              {
                path: 'sales',
                element: (
                  <PermissionRoute permission="sale.read">
                    <SalesPage />
                  </PermissionRoute>
                ),
              },

              // ---------------------------------------------------------
              // ORDERS
              // ---------------------------------------------------------
              {
                path: 'orders',
                element: (
                  <PermissionRoute permission="order.read">
                    <OrdersPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'orders/cashier',
                element: (
                  <PermissionRoute permission="order.read">
                    <CashierOrdersPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'orders/ready',
                element: (
                  <PermissionRoute permission="order.read">
                    <ReadyOrdersPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'orders/unpaid',
                element: (
                  <PermissionRoute permission="order.read">
                    <UnpaidOrdersPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'orders/mine',
                element: (
                  <PermissionRoute permission="order.read">
                    <MyOrdersPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'orders/change-requests',
                element: (
                  <PermissionRoute permission="order.update">
                    <PendingChangeRequestsPage />
                  </PermissionRoute>
                ),
              },

              // Receipts
              {
                path: 'receipts/:receiptId',
                element: (
                  <PermissionRoute permission="receipt.read">
                    <ReceiptPage />
                  </PermissionRoute>
                ),
              },

              // Organization Settings
              {
                path: 'settings/organization',
                element: (
                  <PermissionRoute permission="organization.read">
                    <OrganizationSettingsPage />
                  </PermissionRoute>
                ),
              },

              // Branches
              {
                path: 'branches',
                element: (
                  <PermissionRoute permission="branch.read">
                    <BranchListPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'branches/:branchId',
                element: (
                  <PermissionRoute permission="branch.read">
                    <BranchDetailsPage />
                  </PermissionRoute>
                ),
              },

              // Billing
              {
                path: 'billing',
                element: (
                  <PermissionRoute permission="billing.read">
                    <BillingPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'plans',
                element: (
                  <PermissionRoute permission="billing.read">
                    <AvailablePlansPage />
                  </PermissionRoute>
                ),
              },
            ],
          },

          // ---- Cashier workspace ----
          {
            path: '/cashier',
            element: <CashierLayout />,
            children: [
              { index: true, element: <CashierIndexRedirect /> },
              {
                path: 'orders',
                element: (
                  <PermissionRoute permission="order.read">
                    <CashierOrdersPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'orders/:orderId',
                element: (
                  <PermissionRoute permission="order.read">
                    <CashierOrderDetailPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'pos',
                element: (
                  <PermissionRoute permission="order.read">
                    <PosPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'sales',
                element: (
                  <PermissionRoute permission="sale.read">
                    <SalesPage />
                  </PermissionRoute>
                ),
              },
              {
                path: 'more',
                element: <CashierMorePage />,
              },
            ],
          },

          // ---- Server PWA ----
          {
            path: '/server',
            element: <ServerLayout />,
            children: [
              {
                children: [
                  { index: true, element: <Navigate to="/server/orders" replace /> },
                  { path: 'orders', element: <ServerOrdersPage /> },
                  { path: 'order/new', element: <ServerNewOrderPage /> },
                  { path: 'order/review', element: <ServerOrderReviewPage /> },
                  { path: 'history', element: <ServerHistoryPage /> },
                  { path: 'more', element: <ServerMorePage /> },
                ],
              },
            ],
          },

          // ---- Kitchen Display ----
          {
            path: '/kitchen',
            element: (
              <FeatureRoute feature="KITCHEN">
                <KitchenLayout />
              </FeatureRoute>
            ),
            children: [
              {
                index: true,
                element: (
                  <PermissionRoute permission="kitchen.read">
                    <KitchenPage />
                  </PermissionRoute>
                ),
              },
            ],
          },

          // ---- Super Admin ----
          {
            element: <RoleRoute allowedRoles={['SUPER_ADMIN']} />,
            children: [
              {
                path: '/super-admin',
                element: <DashboardLayout />,
                children: [
                  { index: true, element: <SuperAdminDashboard /> },
                  {
                    path: 'organizations',
                    element: (
                      <PermissionRoute permission="organization.read">
                        <OrganizationListPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: 'organizations/:organizationId',
                    element: (
                      <PermissionRoute permission="organization.read">
                        <OrganizationDetailsPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: 'plans',
                    element: (
                      <PermissionRoute permission="plan.read">
                        <PlansPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: 'features',
                    element: (
                      <PermissionRoute permission="feature.read">
                        <FeaturesPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: 'billing',
                    element: (
                      <PermissionRoute permission="billing.read">
                        <PendingPaymentsPage />
                      </PermissionRoute>
                    ),
                  },
                  {
                    path: 'trials',
                    element: (
                      <PermissionRoute permission="billing.read">
                        <TrialsPage />
                      </PermissionRoute>
                    ),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------
  // PUBLIC / STANDALONE
  // ---------------------------------------------------------------
  { path: '/payment-proof/:token', element: <PaymentProofUploadPage /> },
  { path: '/unauthorized', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
]

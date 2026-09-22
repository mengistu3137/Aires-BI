// app/config/permission-nav.config.js

export const navigationConfig = {
  // ---------------------------------------------------------------
  // SUPER ADMIN
  // ---------------------------------------------------------------
  superAdmin: [
    {
      name: 'SaaS Dashboard',
      path: '/super-admin',
      icon: 'ChartBarIcon',
      permission: 'dashboard.read',
    },
    {
      name: 'Organizations',
      path: '/super-admin/organizations',
      icon: 'BuildingOfficeIcon',
      permission: 'organization.read',
    },
    {
      name: 'Plans',
      path: '/super-admin/plans',
      icon: 'CreditCardIcon',
      permission: 'plan.read',
    },
    {
      name: 'Features',
      path: '/super-admin/features',
      icon: 'CubeIcon',
      permission: 'feature.read',
    },
    {
      name: 'Billing Approvals',
      path: '/super-admin/billing',
      icon: 'CheckBadgeIcon',
      permission: 'billing.read',
    },
    {
      name: 'Trials',
      path: '/super-admin/trials',
      icon: 'GiftIcon',
      permission: 'billing.read',
    },
  ],

  // ---------------------------------------------------------------
  // TENANT ADMIN / MANAGER (full backoffice)
  // ---------------------------------------------------------------
  tenantAdmin: [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'HomeIcon',
      permission: 'dashboard.read',
    },
    {
      name: 'Branches',
      path: '/branches',
      icon: 'MapPinIcon',
      permission: 'branch.read',
    },
    {
      name: 'User Management',
      path: '/user-management',
      icon: 'UsersIcon',
      permission: 'user.read',
    },
    {
      name: 'Catalog Management',
      path: '/products',
      icon: 'FolderIcon',
      permission: 'product.read',
    },
    {
      name: 'Kitchen Management',
      path: '/kitchen',
      icon: 'FolderIcon',
      permission: 'product.read',
    },
    {
      name: 'Inventory',
      icon: 'ArchiveBoxIcon',
      feature: 'INVENTORY',
      permission: 'inventory.read',
      children: [
        {
          name: 'Stock',
          path: '/inventory/stock',
          permission: 'inventory.read',
          feature: 'INVENTORY',
        },
        {
          name: 'Batches',
          path: '/inventory/batches',
          permission: 'inventory.batches.manage',
          feature: 'BATCH_TRACKING',
        },
        {
          name: 'Low Stock',
          path: '/inventory/low-stock',
          permission: 'inventory.read',
          feature: 'INVENTORY',
        },
        {
          name: 'Expiring',
          path: '/inventory/expiring',
          permission: 'inventory.expiry.read',
          feature: 'EXPIRY_TRACKING',
        },
        {
          name: 'Movements',
          path: '/inventory/movements',
          permission: 'inventory.read',
          feature: 'INVENTORY',
        },
      ],
    },
    {
      name: 'Orders',
      path: '/orders',
      icon: 'ShoppingBagIcon',
      permission: 'order.read',
      businessTypes: ['RESTAURANT'],
    },
    {
      name: 'Sales',
      path: '/sales',
      icon: 'CurrencyDollarIcon',
      permission: 'sale.read',
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: 'ChartBarIcon',
      permission: 'report.read',
    },
    {
      name: 'Billing & Plans',
      path: '/billing',
      icon: 'CreditCardIcon',
      permission: 'billing.read',
    },
    {
      name: 'Settings',
      path: '/settings/organization',
      icon: 'CogIcon',
      permission: 'organization.read',
    },
  ],

  // ---------------------------------------------------------------
  // POS (all roles that operate a register)
  // ---------------------------------------------------------------
  pos: [
    {
      name: 'POS Register',
      path: '/pos',
      icon: 'ShoppingCartIcon',
      permission: 'order.read',
    },
    {
      name: 'Sales History',
      path: '/sales',
      icon: 'ClockIcon',
      permission: 'sale.read',
    },
  ],

  // ---------------------------------------------------------------
  // CASHIER
  // ---------------------------------------------------------------
  cashier: [
    {
      name: 'POS Register',
      path: '/pos',
      icon: 'ShoppingCartIcon',
      permission: 'order.read',
    },
    {
      name: 'All Orders',
      path: '/orders/cashier',
      icon: 'ShoppingBagIcon',
      permission: 'order.read',
      businessTypes: ['RESTAURANT'],
    },
    {
      name: 'Unpaid Orders',
      path: '/orders/unpaid',
      icon: 'BanknotesIcon',
      permission: 'order.payment',
      businessTypes: ['RESTAURANT'],
    },
    {
      name: 'Sales History',
      path: '/sales',
      icon: 'ClockIcon',
      permission: 'sale.read',
    },
  ],

  // ---------------------------------------------------------------
  // SERVER / WAITER
  // ---------------------------------------------------------------
  // --- replace the existing `server: [...]` block in navigationConfig ---

  server: [
    {
      name: 'My Orders',
      path: '/server/orders',
      icon: 'ClipboardDocumentListIcon',
      permission: 'order.read',
      businessTypes: ['RESTAURANT'],
    },
    {
      name: 'New Order',
      path: '/server/order/new',
      icon: 'PlusIcon',
      permission: 'order.create',
      businessTypes: ['RESTAURANT'],
    },
    {
      name: 'More',
      path: '/server/more',
      icon: 'EllipsisHorizontalIcon',
      businessTypes: ['RESTAURANT'],
    },
  ],

  // ---------------------------------------------------------------
  // CHEF / KITCHEN
  // ---------------------------------------------------------------
  kitchen: [
    {
      name: 'Kitchen Display',
      path: '/kitchen',
      icon: 'FireIcon',
      permission: 'kitchen.read',
      feature: 'KITCHEN',
    },
    {
      name: 'Pending Changes',
      path: '/orders/change-requests',
      icon: 'ClipboardDocumentListIcon',
      permission: 'order.update',
      businessTypes: ['RESTAURANT'],
    },
  ],
}

// =================================================================
// NAV BUILDER — takes role + permissions + business type into account
// =================================================================

/**
 * Return the nav items a role should see, already filtered by:
 *   - permission (caller passes `can(perm)`)
 *   - feature flags (`hasFeature` — optional)
 *   - business type (`businessType` — optional)
 *
 * @param {object} args
 * @param {'SUPER_ADMIN'|'ADMIN'|'MANAGER'|'CASHIER'|'SERVER'|'CHEF'|'STAFF'} args.role
 * @param {(perm: string) => boolean} args.can
 * @param {(feature: string) => boolean} [args.hasFeature]
 * @param {string} [args.businessType]
 * @returns {Array<{ name: string, path: string, icon: string }>}
 */
export const getNavItems = ({ role, can, hasFeature, businessType }) => {
  const passes = (item) => {
    if (item.permission && !can(item.permission)) return false
    if (item.feature && hasFeature && !hasFeature(item.feature)) return false
    if (item.businessTypes && businessType && !item.businessTypes.includes(businessType)) {
      return false
    }
    return true
  }

  const filtered = (items) => items.filter(passes)

  // Super Admin
  if (role === 'SUPER_ADMIN') {
    return filtered(navigationConfig.superAdmin)
  }

  // Admin / Manager — full backoffice + POS
  if (role === 'ADMIN' || role === 'MANAGER') {
    const backoffice = filtered(navigationConfig.tenantAdmin)
    const posItems = filtered(navigationConfig.pos)

    // Avoid duplicating /pos if it's already in the backoffice list
    const backofficePaths = new Set(backoffice.map((i) => i.path))
    const extraPos = posItems.filter((i) => !backofficePaths.has(i.path))

    // For managers, add pending change requests link (they can approve)
    const extraApprovals =
      role === 'MANAGER'
        ? filtered(navigationConfig.kitchen).filter((i) => i.path === '/orders/change-requests')
        : []

    return [...backoffice, ...extraPos, ...extraApprovals]
  }

  // Cashier
  if (role === 'CASHIER') {
    return filtered(navigationConfig.cashier)
  }

  // Server / Waiter
  if (role === 'SERVER') {
    return filtered(navigationConfig.server)
  }

  // Chef
  if (role === 'CHEF') {
    return filtered(navigationConfig.kitchen)
  }

  // Fallback
  return filtered(navigationConfig.tenantAdmin)
}

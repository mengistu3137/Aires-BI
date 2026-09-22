// src/app/config/permission-nav.config.js
//
// Filters navigationConfig buckets by:
//   1. permission  — can(item.permission) must be true
//   2. feature     — org must have the feature (SaaS plan OR org flag)
//   3. business    — org businessType must be in item.businessTypes (if set)
//
// Items with `children` recurse. A group with no visible children after
// filtering is dropped entirely (so an empty "Inventory" parent never
// renders for a user without any inventory permission).

import { useMemo } from 'react'
import { useFeatureAccess } from '@/hooks/useFeatureAccess.js'
import { usePermissions } from '@/hooks/usePermissions.js'
import { useTenant } from '@/hooks/useTenant.js'
import { navigationConfig } from './navigation.config.js'

export function usePermissionNavigation() {
  const { can } = usePermissions()
  const { hasFeature } = useFeatureAccess()
  const { hasInventory, hasKitchenFlow, currentOrganization } = useTenant()

  const businessType = currentOrganization?.businessType

  // ---------------------------------------------------------------
  // Feature resolution
  //
  // A nav item can declare `feature: 'INVENTORY'`. That resolves as true
  // if either:
  //   - the SaaS plan grants it (hasFeature), OR
  //   - the tenant org has the matching boolean flag set.
  //
  // Batch and expiry tracking live only in the SaaS plan features; there
  // is no org-level boolean fallback for them (yet).
  // ---------------------------------------------------------------
  const checkFeatureAccess = (featureKey) => {
    if (!featureKey) return true

    const normalized = String(featureKey).toUpperCase()

    if (hasFeature(featureKey) || hasFeature(normalized)) {
      return true
    }

    if (normalized === 'INVENTORY') return Boolean(hasInventory)
    if (normalized === 'KITCHEN') return Boolean(hasKitchenFlow)

    return false
  }

  // ---------------------------------------------------------------
  // Single-item filter (shared by leaves and parents)
  // ---------------------------------------------------------------
  const passes = (item) => {
    // Permission
    if (item.permission && !can(item.permission)) return false

    // Feature
    if (item.feature && !checkFeatureAccess(item.feature)) return false

    // Business type
    if (item.businessTypes && businessType && !item.businessTypes.includes(businessType)) {
      return false
    }

    return true
  }

  // ---------------------------------------------------------------
  // Recursive filter: returns the item with a filtered `children` array,
  // or null if the item and all its children should be dropped.
  // ---------------------------------------------------------------
  const filterItem = (item) => {
    const ownPass = passes(item)

    if (Array.isArray(item.children) && item.children.length > 0) {
      const visibleChildren = item.children.map((child) => filterItem(child)).filter(Boolean)

      // A group is visible only if the user can see at least one child.
      // The parent's own permission/feature gate doesn't hide the group
      // as long as it has visible children — this avoids the case where
      // the parent is gated by 'inventory.read' but a child is gated by
      // a narrower code the user does have.
      if (visibleChildren.length === 0) return null

      return { ...item, children: visibleChildren }
    }

    return ownPass ? item : null
  }

  // ---------------------------------------------------------------
  // Pre-filtered buckets — one per nav section
  // ---------------------------------------------------------------
  const filterBucket = (items) => (items || []).map(filterItem).filter(Boolean)

  const superAdminNav = filterBucket(navigationConfig.superAdmin)
  const tenantAdminNav = filterBucket(navigationConfig.tenantAdmin)
  const posNav = filterBucket(navigationConfig.pos)
  const cashierNav = filterBucket(navigationConfig.cashier)
  const serverNav = filterBucket(navigationConfig.server)
  const kitchenNav = filterBucket(navigationConfig.kitchen)

  // Approvals bucket — managers and admins surface the pending-change-
  // requests link, which lives in the kitchen config's RESTAURANT entries.
  const approvalNav = filterBucket(
    (navigationConfig.kitchen || []).filter((i) => i.path === '/orders/change-requests'),
  )

  // ---------------------------------------------------------------
  // Role assembly — used by Sidebar.getNavItems()
  // ---------------------------------------------------------------
  const getNavForRole = (role) => {
    if (role === 'SUPER_ADMIN') return superAdminNav

    if (role === 'ADMIN' || role === 'MANAGER') {
      const seen = new Set()
      return [...tenantAdminNav, ...posNav, ...approvalNav].filter((item) => {
        const key = item.path || item.name
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    if (role === 'CASHIER') return cashierNav
    if (role === 'SERVER') return serverNav
    if (role === 'CHEF') return kitchenNav

    return tenantAdminNav
  }

  return useMemo(
    () => ({
      superAdminNav,
      tenantAdminNav,
      posNav,
      cashierNav,
      serverNav,
      kitchenNav,
      approvalNav,
      getNavForRole,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [can, hasFeature, hasInventory, hasKitchenFlow, businessType],
  )
}

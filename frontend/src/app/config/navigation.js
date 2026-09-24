import React from "react";
import {
  LayoutDashboard,
  ClipboardList,
  TrendingUp,
  Package,
  Store,
  ShieldCheck,
  Eye,
  Crown,
  BarChart3,
  Bell,
  Users,
} from "lucide-react";

/**
 * Central navigation configuration.
 * - `id`     — stable identifier used for active-tab detection
 * - `label`  — display text (Title Case)
 * - `path`   — route path (must match index.jsx)
 * - `icon`   — React element rendered in the sidebar
 * - `roles`  — which roles can SEE this item (visibility only)
 *              Actual authorization is enforced by ProtectedRoute in routes.
 *
 * Routes must still enforce access via ProtectedRoute regardless of this config.
 */
export const NAVIGATION = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["ADMIN", "MANAGER", "FIELD_AUDITOR"],
  },
  {
    id: "survey",
    label: "Field Price Collection",
    path: "/survey",
    icon: <ClipboardList size={18} />,
    roles: ["ADMIN", "MANAGER", "FIELD_AUDITOR"],
  },
  {
    id: "progress",
    label: "Assignments & Progress",
    path: "/progress",
    icon: <TrendingUp size={18} />,
    roles: ["ADMIN", "MANAGER", "FIELD_AUDITOR"],
  },
  {
    id: "products",
    label: "Products",
    path: "/products",
    icon: <Package size={18} />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    id: "stores",
    label: "Competitor Stores",
    path: "/stores",
    icon: <Store size={18} />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    id: "audits",
    label: "Audit Visits",
    path: "/audits",
    icon: <ShieldCheck size={18} />,
    roles: ["ADMIN", "MANAGER", "FIELD_AUDITOR"],
  },
  {
    id: "observations",
    label: "Observations",
    path: "/observations",
    icon: <Eye size={18} />,
    roles: ["ADMIN", "MANAGER", "FIELD_AUDITOR"],
  },
  {
    id: "queens-prices",
    label: "Queens Prices",
    path: "/queens-prices",
    icon: <Crown size={18} />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    id: "price-analysis",
    label: "Price Analysis",
    path: "/price-analysis",
    icon: <BarChart3 size={18} />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    id: "alerts",
    label: "Alerts",
    path: "/alerts",
    icon: <Bell size={18} />,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    id: "users",
    label: "Auditors & Staff",
    path: "/users",
    icon: <Users size={18} />,
    roles: ["ADMIN"],
  },
];

/**
 * Filter navigation items by user role.
 * Only affects visibility — does NOT replace route authorization.
 */
export const getNavigationForRole = (role) => {
  if (!role) return [];
  return NAVIGATION.filter((item) => item.roles.includes(role));
};

/**
 * Resolve the active navigation id from the current pathname.
 * Matches exact path first, then nested paths (e.g. /products/123 → products).
 */
export const resolveActiveNavigationId = (pathname) => {
  if (!pathname) return null;

  // Exact match first
  const exact = NAVIGATION.find((item) => item.path === pathname);
  if (exact) return exact.id;

  // Prefix match — pick the longest matching path to avoid
  // /audits/:id/observations incorrectly matching a hypothetical /audits-observations
  const prefixed = NAVIGATION.filter(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
  ).sort((a, b) => b.path.length - a.path.length);

  if (prefixed.length > 0) return prefixed[0].id;

  return null;
};

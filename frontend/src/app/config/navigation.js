import {
  LayoutDashboard,
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
import { canRoleViewPage } from "@/permissions/permissions.js";

export const NAVIGATION = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "progress",
    label: "Assignments & Progress",
    path: "/progress",
    icon: TrendingUp,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "products",
    label: "Products",
    path: "/products",
    icon: Package,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "stores",
    label: "Competitor Stores",
    path: "/stores",
    icon: Store,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "audits",
    label: "Audit Visits",
    path: "/audits",
    icon: ShieldCheck,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "FIELD_AUDITOR", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "observations",
    label: "Observations",
    path: "/observations",
    icon: Eye,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "queens-prices",
    label: "Queens Prices",
    path: "/queens-prices",
    icon: Crown,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "price-analysis",
    label: "Price Analysis",
    path: "/price-analysis",
    icon: BarChart3,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "alerts",
    label: "Alerts",
    path: "/alerts",
    icon: Bell,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"],
  },
  {
    id: "users",
    label: "Manage Users",
    path: "/users",
    icon: Users,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
];

export const getNavigationForRole = (role) => {
  if (!role) return [];
  // Dynamically checks custom checkbox permissions saved in Privileges tab
  return NAVIGATION.filter((item) => canRoleViewPage(role, item.id));
};

export const resolveActiveNavigationId = (pathname) => {
  if (!pathname) return null;
  const exact = NAVIGATION.find((item) => item.path === pathname);
  if (exact) return exact.id;

  const prefixed = NAVIGATION.filter(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`)
  ).sort((a, b) => b.path.length - a.path.length);

  if (prefixed.length > 0) return prefixed[0].id;
  return null;
};
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

export const NAVIGATION = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    id: "progress",
    label: "Assignments & Progress",
    path: "/progress",
    icon: TrendingUp,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    id: "products",
    label: "Products",
    path: "/products",
    icon: Package,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    id: "stores",
    label: "Competitor Stores",
    path: "/stores",
    icon: Store,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    id: "audits",
    label: "Audit Visits",
    path: "/audits",
    icon: ShieldCheck,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "FIELD_AUDITOR"],
  },
  {
    id: "observations",
    label: "Observations",
    path: "/observations",
    icon: Eye,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    id: "queens-prices",
    label: "Queens Prices",
    path: "/queens-prices",
    icon: Crown,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    id: "price-analysis",
    label: "Price Analysis",
    path: "/price-analysis",
    icon: BarChart3,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  },
  {
    id: "alerts",
    label: "Alerts",
    path: "/alerts",
    icon: Bell,
    iconSize: 18,
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER"],
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
  return NAVIGATION.filter((item) => item.roles.includes(role));
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
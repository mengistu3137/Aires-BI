import React, { useState } from "react";
import { Outlet, useLocation, useNavigate, Navigate } from "react-router-dom";
import { Header } from "@/components/Header.jsx";
import { Sidebar } from "@/components/Sidebar.jsx";
import { PwaInstallBanner } from "@/pwa/PwaInstallBanner.jsx";
import { resolveActiveNavigationId, NAVIGATION } from "@/app/config/navigation.js";
import { useAuth } from "@/hooks/useAuth.js";

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuditor } = useAuth();

  // Field Auditor auto-redirection: Auditors operate exclusively on /audits
  if (isAuditor && (location.pathname === "/" || location.pathname === "/survey" || location.pathname === "/progress")) {
    return <Navigate to="/audits" replace />;
  }

  // Resolve active tab using navigation config (Managers & Admins only)
  const activeTab = resolveActiveNavigationId(location.pathname) || "dashboard";

  const handleSelectTab = (tabId) => {
    const navItem = NAVIGATION.find((item) => item.id === tabId);
    if (navItem?.path) {
      navigate(navItem.path);
    } else {
      navigate(`/${tabId}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar rendered ONLY for Management & Administrators */}
      {!isAuditor && (
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area: Expands to full width for Field Auditors */}
      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0 w-full">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className={`flex-1 ${isAuditor ? "p-3 sm:p-5 max-w-3xl mx-auto w-full" : "p-4 sm:p-6 lg:p-8"}`}>
          <Outlet />
        </main>
      </div>

      <PwaInstallBanner />
    </div>
  );
};
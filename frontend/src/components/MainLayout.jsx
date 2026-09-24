import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header.jsx";
import { Sidebar } from "@/components/Sidebar.jsx";
import { PwaInstallBanner } from "@/pwa/PwaInstallBanner.jsx";
import { resolveActiveNavigationId, NAVIGATION } from "@/app/config/navigation.js";

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Resolve active tab using your navigation config
  const activeTab = resolveActiveNavigationId(location.pathname) || "dashboard";

  const handleSelectTab = (tabId) => {
    // Look up item path in NAVIGATION
    const navItem = NAVIGATION.find((item) => item.id === tabId);
    if (navItem?.path) {
      navigate(navItem.path);
    } else {
      navigate(`/${tabId}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-x-hidden min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <PwaInstallBanner />
    </div>
  );
};
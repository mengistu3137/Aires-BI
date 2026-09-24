import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header.jsx";
import { Sidebar } from "@/components/Sidebar.jsx";
import { PwaInstallBanner } from "@/pwa/PwaInstallBanner.jsx";
import { NAVIGATION, resolveActiveNavigationId } from "@/app/config/navigation.js";

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = resolveActiveNavigationId(location.pathname);

  const handleSelectTab = (tabId) => {
    const item = NAVIGATION.find((n) => n.id === tabId);
    if (item) navigate(item.path);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <PwaInstallBanner />
    </div>
  );
};

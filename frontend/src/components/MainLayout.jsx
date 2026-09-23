import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header.jsx";
import { Sidebar } from "@/components/Sidebar.jsx";
import { PwaInstallBanner } from "@/pwa/PwaInstallBanner.jsx";

export const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.includes("dashboard")
    ? "dashboard"
    : location.pathname.includes("queens-prices")
      ? "queens-prices"
      : location.pathname.includes("audits")
        ? "audits"
        : location.pathname.includes("progress")
          ? "progress"
          : location.pathname.includes("users")
            ? "users"
            : "survey";

  const handleSelectTab = (tabId) => {
    navigate(`/${tabId}`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Collapsible/Responsive Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* PWA Offline Install Prompt Banner */}
      <PwaInstallBanner />
    </div>
  );
};

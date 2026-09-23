import React from "react";
import { useAuth } from "@/hooks/useAuth.js";

export const Sidebar = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const { isManager, isAuditor, isAdmin } = useAuth();

  const navItems = [
    {
      id: "dashboard",
      label: "BI Pricing Dashboard",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      visible: isManager,
      badge: "Core BI",
    },
    {
      id: "survey",
      label: "Field Price Collection",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      visible: true,
      badge: isAuditor ? "My Audit" : null,
    },
    {
      id: "progress",
      label: "Assignments & Sync Queue",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
      visible: true,
    },
    {
      id: "users",
      label: "Auditors & Territories",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      visible: isAdmin,
    },
    {
      id: "audits",
      label: "Audit Visits",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      visible: true,
      badge: isAuditor ? "Field" : null,
    },
    {
      id: "queens-prices",
      label: "Queens Prices",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      visible: isManager,
      badge: "Benchmark",
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-68 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#A41821]" />
            <span className="h-3 w-3 rounded-full bg-[#017C4D]" />
            <span className="h-3 w-3 rounded-full bg-[#FE7914]" />
            <span className="text-xs font-bold tracking-wider text-slate-500 uppercase ml-2">
              Aires Platform
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-4">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-[#A41821] text-white shadow-sm font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={active ? "text-white" : "text-slate-500"}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        active ? "bg-white/20 text-white" : "bg-[#017C4D]/10 text-[#017C4D]"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* Survey Cycle Indicator */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/75">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Active Cycle:</span>
            <span className="rounded-sm bg-slate-200 px-1.5 py-0.5 font-bold text-slate-800">
              2026-W39
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Benchmark Target: 95.0%</p>
        </div>
      </aside>
    </>
  );
};

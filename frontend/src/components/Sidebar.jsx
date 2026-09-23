import React from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { getNavigationForRole } from "@/app/config/navigation.js";

export const Sidebar = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const { role } = useAuth();
  const visibleNavigation = getNavigationForRole(role);

  const handleNavigate = (item) => {
    onSelectTab(item.id);
    if (onClose) onClose();
  };

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

        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {visibleNavigation.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item)}
                className={`flex w-full items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-[#A41821] text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className={active ? "text-white" : "text-slate-500"}>
                  {/* Icons can be added to navigation config later if desired.
                      For now, render a simple dot to preserve compact styling. */}
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                </span>
                <span className="ml-3">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

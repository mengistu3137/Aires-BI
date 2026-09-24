import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { getNavigationForRole } from "@/app/config/navigation.js";
import { usePeriods } from "@/features/survey/hooks/usePeriods.js";
import { PeriodManagementModal } from "@/features/survey/components/PeriodManagementModal.jsx";

export const Sidebar = ({ activeTab, onSelectTab, isOpen, onClose }) => {
	const { role, isManager } = useAuth();
	const { activePeriod } = usePeriods();
	const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

	const visibleNavigation = getNavigationForRole(role);

	const handleNavigate = (item) => {
		onSelectTab(item.id);
		if (onClose) onClose();
	};

	return (
		<>
			{/* Mobile backdrop */}
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
				{/* Brand header */}
				<div className="flex h-16 items-center px-6 border-b border-slate-100 flex-none">
					<div className="flex items-center gap-2">
						<span className="h-3 w-3 rounded-full bg-[#A41821]" />
						<span className="h-3 w-3 rounded-full bg-[#017C4D]" />
						<span className="h-3 w-3 rounded-full bg-[#FE7914]" />
						<span className="text-xs font-bold tracking-wider text-slate-500 uppercase ml-2">
							Aires Platform
						</span>
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
					{visibleNavigation.map((item) => {
						const active = activeTab === item.id;
						const Icon = item.icon; // lucide-react component
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
									{Icon ? <Icon size={item.iconSize ?? 18} /> : null}
								</span>
								<span className="ml-3">{item.label}</span>
							</button>
						);
					})}
				</nav>

				{/* Survey Cycle Indicator Footer */}
				<div className="p-4 border-t border-slate-100 bg-slate-50/75 flex-none">
					<div className="flex items-center justify-between text-xs text-slate-600">
						<span className="font-medium">Active Cycle:</span>
						{isManager ? (
							<button
								type="button"
								onClick={() => setIsPeriodModalOpen(true)}
								className="rounded-md bg-slate-200 hover:bg-[#A41821] hover:text-white px-2 py-0.5 font-bold font-mono text-slate-800 transition cursor-pointer"
								title="Click to manage survey cycles"
							>
								{activePeriod?.id || "2026-W39"} ⚙️
							</button>
						) : (
							<span className="rounded-md bg-slate-200 px-1.5 py-0.5 font-bold font-mono text-slate-800">
								{activePeriod?.id || "2026-W39"}
							</span>
						)}
					</div>
					<p className="mt-1 text-[11px] text-slate-400">
						Benchmark Target: 95.0%
					</p>
				</div>
			</aside>

			{/* Period management modal (manager only) */}
			{isManager && (
				<PeriodManagementModal
					isOpen={isPeriodModalOpen}
					onClose={() => setIsPeriodModalOpen(false)}
				/>
			)}
		</>
	);
};
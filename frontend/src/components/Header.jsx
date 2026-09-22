import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { PILOT_USERS } from "@/data/pilotData.js";
import {AiresLogo} from "@/components/AiresLogo.jsx"

export const Header = ({ onToggleSidebar }) => {
	const { user, role, isAuditor, isManager, isAdmin, login, logout } =
		useAuth();
	const [isOnline, setIsOnline] = useState(navigator.onLine);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const handleSwitchPersona = (targetRole) => {
		const persona =
			PILOT_USERS.find((u) => u.role === targetRole) || PILOT_USERS[0];
		login({
			user: persona,
			token: "demo-session-token",
		});
	};

	return (
		<header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6">
			{/* Left: Mobile Toggle & Aires Identity */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onToggleSidebar}
					className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-hidden"
					aria-label="Toggle navigation menu"
				>
					<svg
						aria-label="hidden"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
				</button>

				<div className="flex items-center gap-2.5">
					<AiresLogo className="h-10 w-auto" />
					<div>
						<div className="flex items-center gap-1.5">
							<span className="text-base font-black tracking-tight text-[#A41821]">
								AIRES
							</span>
							<span className="rounded-sm bg-[#017C4D] px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
								BI
							</span>
						</div>
						<p className="text-[10px] font-medium text-slate-400 hidden sm:block">
							Retail Price Intelligence & Field Audit
						</p>
					</div>
				</div>
			</div>

			{/* Right: Network Status, Pilot Role Switcher & User Profile */}
			<div className="flex items-center gap-3">
				{/* Network Connectivity Pill */}
				<div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium">
					<span
						className={`h-2 w-2 rounded-full ${
							isOnline
								? "bg-[#017C4D] ring-2 ring-emerald-100"
								: "bg-[#FE7914] ring-2 ring-amber-100 animate-pulse"
						}`}
					/>
					<span className="text-slate-600 hidden md:inline">
						{isOnline ? "Online Sync" : "Offline PWA Mode"}
					</span>
				</div>

				{/* Demo Persona Switcher (Directly mutates Zustand state) */}
				<div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
					<button
						type="button"
						onClick={() => handleSwitchPersona("FIELD_AUDITOR")}
						className={`px-2.5 py-1 rounded-md font-medium transition-all ${
							isAuditor
								? "bg-white text-[#A41821] shadow-xs font-bold"
								: "text-slate-600 hover:text-slate-900"
						}`}
					>
						Auditor
					</button>
					<button
						type="button"
						onClick={() => handleSwitchPersona("MANAGER")}
						className={`px-2.5 py-1 rounded-md font-medium transition-all ${
							role === "MANAGER"
								? "bg-white text-[#017C4D] shadow-xs font-bold"
								: "text-slate-600 hover:text-slate-900"
						}`}
					>
						Manager
					</button>
					<button
						type="button"
						onClick={() => handleSwitchPersona("ADMIN")}
						className={`px-2.5 py-1 rounded-md font-medium transition-all ${
							isAdmin
								? "bg-white text-slate-900 shadow-xs font-bold"
								: "text-slate-600 hover:text-slate-900"
						}`}
					>
						Admin
					</button>
				</div>

				{/* User Card & Logout */}
				<div className="flex items-center gap-2 pl-2 border-l border-slate-200">
					<div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-xs">
						{user?.name ? user.name.slice(0, 2).toUpperCase() : "AI"}
					</div>
					<div className="hidden text-left lg:block leading-tight">
						<p className="text-xs font-bold text-slate-800">
							{user?.name || "Guest"}
						</p>
						<p className="text-[11px] font-medium text-slate-500">
							{role === "FIELD_AUDITOR"
								? "Field Auditor"
								: role === "MANAGER"
									? "Pricing Manager"
									: "Administrator"}
						</p>
					</div>
					<button
						type="button"
						onClick={logout}
						className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-[#A41821] transition"
						title="Sign out"
					>
						<svg
							aria-label="hidden"
							className="w-4 h-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
					</button>
				</div>
			</div>
		</header>
	);
};
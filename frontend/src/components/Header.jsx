import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { AiresLogo } from "@/components/AiresLogo.jsx";
import { useLocationPermissionSync } from "@/hooks/useLocationPermissionSync.js";
import { subscribeToRealtimeEvent } from "@/services/socket.js";
import {
	getPendingRecalculationsRequest,
	dismissPendingRecalculationRequest,
} from "@/services/api/price-analysis.api.js";
import toast from "react-hot-toast";

export const Header = ({ onToggleSidebar }) => {
	const navigate = useNavigate();
	const {
		user,
		role,
		isAuditor,
		isSuperAdmin,
		isQueensAdmin,
		isImpersonating,
		impersonator,
		stopImpersonation,
		logout,
	} = useAuth();

	const [isOnline, setIsOnline] = useState(
		typeof navigator !== "undefined" ? navigator.onLine : true,
	);

	const [recalcRequest, setRecalcRequest] = useState(null);

	useLocationPermissionSync();

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOffline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// Query persistent pending requests on mount / when returning as Admin
	useEffect(() => {
		if (isQueensAdmin || isAuditor) return;

		let isMounted = true;
		getPendingRecalculationsRequest()
			.then((res) => {
				if (!isMounted) return;
				const requests = res?.data || [];
				if (requests.length > 0) {
					setRecalcRequest(requests[0]);
				}
			})
			.catch(() => {});

		// Also listen for real-time events while online
		const unsubscribe = subscribeToRealtimeEvent(
			"recalculation:requested",
			(data) => {
				if (isMounted) setRecalcRequest(data);
			},
		);

		return () => {
			isMounted = false;
			if (typeof unsubscribe === "function") unsubscribe();
		};
	}, [isQueensAdmin, isAuditor, isImpersonating]);

	const handleExitImpersonation = () => {
		stopImpersonation();
		toast.success("Returned to Super Admin session");
		navigate("/users");
	};

	// Clicking banner: dismisses from server and navigates directly to the cycle
	const handleClickRecalcNotification = async () => {
		if (!recalcRequest) return;
		const targetPeriodId = recalcRequest.surveyPeriodId;

		setRecalcRequest(null);
		try {
			await dismissPendingRecalculationRequest(targetPeriodId);
		} catch {
			// silent fallback
		}

		navigate(`/price-analysis?surveyPeriodId=${targetPeriodId}`);
	};

	// Clicking ✕: dismisses from server and removes banner
	const handleDismissRecalcNotification = async (e) => {
		e.stopPropagation();
		if (!recalcRequest) return;
		const targetPeriodId = recalcRequest.surveyPeriodId;

		setRecalcRequest(null);
		try {
			await dismissPendingRecalculationRequest(targetPeriodId);
		} catch {
			// silent fallback
		}
	};

	const getRoleLabel = () => {
		if (isAuditor) return "Field Auditor";
		if (isQueensAdmin) return "Queens Admin";
		if (isSuperAdmin) return "Aires Super Admin";
		if (role === "ADMIN") return "Aires Admin";
		return role?.replace("_", " ") || "Staff";
	};

	return (
		<>
			{/* UNIVERSAL PERSISTENT EXIT IMPERSONATION BANNER */}
			{isImpersonating && (
				<div className="sticky top-0 z-50 flex h-10 w-full items-center justify-between border-b-2 border-amber-400 bg-amber-500 px-4 text-white shadow-md sm:px-6 animate-in slide-in-from-top-2">
					<div className="flex items-center gap-2 text-xs font-bold truncate">
						<span className="text-sm">⚠️</span>
						<span className="truncate">
							Viewing platform on behalf of:{" "}
							<strong className="underline">{user?.name}</strong> (
							{getRoleLabel()})
							{impersonator && ` • Impersonated by ${impersonator.name}`}
						</span>
					</div>

					<button
						type="button"
						onClick={handleExitImpersonation}
						className="rounded-lg bg-black/80 hover:bg-black px-3 py-1 text-xs font-black text-amber-300 shadow-sm transition active:scale-95 cursor-pointer flex-none ml-2"
					>
						Exit Impersonation ✕
					</button>
				</div>
			)}

			{/* PERSISTENT CLIENT RECALCULATION REQUEST BANNER */}
			{recalcRequest && (
				<div
					onClick={handleClickRecalcNotification}
					className="sticky top-0 z-40 flex min-h-10 w-full items-center justify-between border-b-2 border-emerald-400 bg-[#017C4D] px-4 py-1.5 text-white shadow-md sm:px-6 cursor-pointer hover:bg-[#01633D] transition animate-in slide-in-from-top-2"
					title="Click to review and run recalculation"
				>
					<div className="flex items-center gap-2 text-xs font-bold truncate">
						<span className="text-sm">🔔</span>
						<span className="truncate">
							Recalculation Request:{" "}
							<strong>{recalcRequest.requestedBy?.name || "Client"}</strong>{" "}
							(Queens Admin) requested Price Analysis refresh for{" "}
							<u className="font-mono text-emerald-200">
								{recalcRequest.surveyPeriodName || recalcRequest.surveyPeriodId}
							</u>
						</span>
					</div>

					<div className="flex items-center gap-2 flex-none ml-2">
						<span className="rounded bg-white/20 px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider hover:bg-white/30 transition">
							Review &amp; Run →
						</span>
						<button
							type="button"
							onClick={handleDismissRecalcNotification}
							className="rounded-lg bg-black/30 hover:bg-black/50 p-1 text-white text-xs cursor-pointer transition"
							title="Dismiss (Mark as read)"
						>
							✕
						</button>
					</div>
				</div>
			)}

			{/* Main Header */}
			<header
				className={`sticky ${
					isImpersonating || recalcRequest ? "top-10" : "top-0"
				} z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6`}
			>
				<div className="flex items-center gap-3">
					{!isAuditor && (
						<button
							type="button"
							onClick={onToggleSidebar}
							className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-hidden cursor-pointer"
							aria-label="Toggle navigation menu"
						>
							<svg
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
					)}

					<Link
						to={isAuditor ? "/audits" : "/"}
						className="flex items-center gap-2.5 select-none group"
					>
						<AiresLogo className="h-9 w-auto flex-none transition-transform group-hover:scale-105" />
						<div className="flex flex-col justify-center">
							<div className="flex items-baseline font-black tracking-tight leading-none">
								<span className="text-base sm:text-lg tracking-tight text-[#A41821]">
									AIRES
								</span>
								<span className="text-xl sm:text-2xl font-black tracking-tighter text-[#017C4D] -ml-0.5">
									BI
								</span>
							</div>
							<p className="text-[9px] font-medium text-slate-400 hidden sm:block tracking-wide">
								Retail Price Intelligence
							</p>
						</div>
					</Link>
				</div>

				<div className="flex items-center gap-2.5 sm:gap-3">
					<div className="flex items-center gap-2 pl-2 border-l border-slate-200">
						<div
							className={`flex h-9 w-9 items-center justify-center rounded-full text-white font-bold text-xs shadow-2xs ${
								isSuperAdmin
									? "bg-[#A41821]"
									: isQueensAdmin
										? "bg-[#017C4D]"
										: "bg-slate-800"
							}`}
						>
							{user?.name ? user.name.slice(0, 2).toUpperCase() : "AI"}
						</div>
						<div className="hidden text-left sm:block leading-tight">
							<p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
								{user?.name || "User"}
							</p>
							<p className="text-[10px] font-semibold text-slate-500">
								{getRoleLabel()}
							</p>
						</div>

						<span
							title={
								isOnline
									? "Online (Connected to server)"
									: "Offline (Offline queue enabled)"
							}
							className={`h-2.5 w-2.5 rounded-full ${
								isOnline
									? "bg-[#017C4D] ring-2 ring-emerald-100"
									: "bg-[#FE7914] ring-2 ring-amber-100 animate-pulse"
							}`}
						/>

						<button
							type="button"
							onClick={logout}
							className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-[#A41821] transition cursor-pointer"
							title="Sign out"
						>
							<svg
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
		</>
	);
};
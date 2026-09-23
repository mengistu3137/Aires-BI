import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { AiresLogo } from "@/components/AiresLogo.jsx";
import { useLocationPermissionSync } from "@/hooks/useLocationPermissionSync.js";

export const Header = ({ onToggleSidebar }) => {
  const { user, role, isAuditor, isManager, isAdmin, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  // Automatically syncs & returns the active location permission status
  const locationPermission = useLocationPermissionSync();

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

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-xs sm:px-6">
      {/* Left: Mobile Toggle & Inline Connected AIRESBI Brand */}
      <div className="flex items-center gap-3">
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

        {/* Brand Container with 3D Mark and Connected "AIRESBI" text */}
        <Link to="/" className="flex items-center gap-2.5 select-none group">
          <AiresLogo className="h-9 w-auto flex-none transition-transform group-hover:scale-105" />
          <div className="flex flex-col justify-center">
            {/* Inline Connected Text: "AIRES" in red (#A41821), "BI" connected in green (#017C4D) with larger font */}
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

      {/* Right: Network Status, Role-Based Actions & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
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

        {/* ======================================================== */}
        {/* ROLE-BASED HEADER ACTIONS (No dummy data / persona switchers) */}
        {/* ======================================================== */}

        {/* Auditor Action: Location Permission State Indicator */}
        {isAuditor && (
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
              locationPermission === "ALLOWED"
                ? "bg-emerald-50 text-[#017C4D] border-emerald-200"
                : locationPermission === "DENIED"
                ? "bg-red-50 text-[#A41821] border-red-200"
                : "bg-amber-50 text-[#FE7914] border-amber-200"
            }`}
            title={`Device Location Permission: ${locationPermission}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                locationPermission === "ALLOWED"
                  ? "bg-[#017C4D]"
                  : locationPermission === "DENIED"
                  ? "bg-[#A41821]"
                  : "bg-[#FE7914] animate-pulse"
              }`}
            />
            <span className="text-[11px]">
              {locationPermission === "ALLOWED"
                ? "GPS: Allowed"
                : locationPermission === "DENIED"
                ? "GPS: Blocked"
                : "GPS: Prompt"}
            </span>
          </div>
        )}

        {/* Manager & Admin Actions: Quick Management Links */}
        {isManager && (
          <div className="hidden lg:flex items-center gap-1.5">
            <Link
              to="/progress"
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition"
            >
              Assignments
            </Link>
            <Link
              to="/products"
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition"
            >
              Products
            </Link>
          </div>
        )}

        {/* User Card & Logout */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-xs shadow-2xs">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AI"}
          </div>
          <div className="hidden text-left sm:block leading-tight">
            <p className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
              {user?.name || "User"}
            </p>
            <p className="text-[10px] font-medium text-slate-500">
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
  );
};
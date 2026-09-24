import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.js";
import { AiresLogo } from "@/components/AiresLogo.jsx";
import { useLocationPermissionSync } from "@/hooks/useLocationPermissionSync.js";

export const Header = ({ onToggleSidebar }) => {
  const { user, role, isAuditor, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useLocationPermissionSync();

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
      {/* Left: Mobile Toggle (Managers/Admins only) & Connected Brand */}
      <div className="flex items-center gap-3">
        {!isAuditor && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden focus:outline-hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Brand Container */}
        <Link to={isAuditor ? "/audits" : "/"} className="flex items-center gap-2.5 select-none group">
          <AiresLogo className="h-9 w-auto flex-none transition-transform group-hover:scale-105" />
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline font-black tracking-tight leading-none">
              <span className="text-base sm:text-lg tracking-tight text-[#A41821]">AIRES</span>
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-[#017C4D] -ml-0.5">BI</span>
            </div>
            <p className="text-[9px] font-medium text-slate-400 hidden sm:block tracking-wide">
              Retail Price Intelligence
            </p>
          </div>
        </Link>
      </div>

      {/* Right: Network Status, User Profile & Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white font-bold text-xs shadow-2xs">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : "AI"}
          </div>
          <div className="hidden text-left sm:block leading-tight">
            <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
              {user?.name || "User"}
            </p>
            <p className="text-[10px] font-medium text-slate-500">
              {isAuditor ? "Field Auditor" : role === "MANAGER" ? "Pricing Manager" : "Administrator"}
            </p>
          </div>

          {/* Network connectivity dot */}
          <span
            title={isOnline ? "Online (Connected to server)" : "Offline (Offline queue enabled)"}
            className={`h-2.5 w-2.5 rounded-full ${
              isOnline ? "bg-[#017C4D] ring-2 ring-emerald-100" : "bg-[#FE7914] ring-2 ring-amber-100 animate-pulse"
            }`}
          />

          <button
            type="button"
            onClick={logout}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-[#A41821] transition cursor-pointer"
            title="Sign out"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
// 1. React Built-ins (Destructured hooks sorted alphabetically: e -> r -> s)
import React, { useEffect, useRef, useState } from "react";

// 2. Absolute Alias Imports (Sorted alphabetically: badge -> card)
import { Badge } from "@/components/ui/badge.jsx";
import { Card } from "@/components/ui/card.jsx";
import { usePermissions } from "@/hooks/usePermissions.js"; // ✅ REUSE: Aligned permissions-aware helper

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const GenerativeAuraAvatar = ({ name, email }) => {
  const seedKey = `${name}-${email}`;
  const hash = hashString(seedKey);

  const gradientPairs = [
   
    { from: "#1748d6", to: "#648cff" },
   
  ];

  const pair = gradientPairs[hash % gradientPairs.length];
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "M";

  return (
    <div className="relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 select-none items-center justify-center rounded-full border-gradient-wrapper  flex border border-primary-100/40 bg-surface/50 shadow-soft overflow-hidden group">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `linear-gradient(135deg, ${pair.from} 0%, ${pair.to} 100%)`,
        }}
      />
      <div
        className="absolute h-7 w-7 rounded-full blur-md opacity-70 animate-float"
        style={{
          background: pair.to,
          top: "10%",
          left: "30%",
        }}
      />
      <img
        src="/logo.png"
        alt="Milki Flow Brand Seal"
        className="absolute -right-2 -bottom-2 h-8 w-8 object-contain opacity-25 select-none pointer-events-none transform rotate-12 transition-transform duration-300 group-hover:scale-110"
      />
      <span className="relative z-10 text-xs sm:text-sm font-extrabold tracking-tight text-white drop-shadow-md">
        {initials}
      </span>
    </div>
  );
};

export const UserListItem = ({
  user,
  onEdit,
  onResetPassword,
  onDelete,
  onToggleStatus,
  isMutatingStatus = false,
}) => {
  const { id, name, email, role, isActive, branch } = user;
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const cardRef = useRef(null);

  // ✅ REUSE: Leverage our permission checker to construct a secure UI
  const { can } = usePermissions();

  // Evaluate if the logged-in administrator can see the menu button at all
  const hasManagementPermissions =
    can("user.password.reset") || can("user.update") || can("user.delete");

  useEffect(() => {
    if (!actionsExpanded) return;

    const handleOutsideClick = (event) => {
      if (cardRef.current && !cardRef.current.contains(event.target)) {
        setActionsExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [actionsExpanded]);

  const handleToggleClick = () => {
    if (onToggleStatus && !isMutatingStatus) {
      onToggleStatus(id, !isActive);
    }
  };

  return (
    <div
      ref={cardRef}
      className={`relative rounded-2xl transition-all duration-200 ${
        actionsExpanded ? "z-30 shadow-soft-xl" : "z-10 shadow-soft"
      }`}
    >
      <Card className="flex flex-col justify-between h-36 border border-primary-100/60 bg-surface p-3.5">
        {/* Header Row */}
        <div className="flex items-center gap-2.5 min-w-0">
          <GenerativeAuraAvatar name={name} email={email} />

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h4 className="text-xs sm:text-sm font-extrabold leading-tight truncate text-text-primary">
              {name}
            </h4>
            <span className="text-[10px] sm:text-xs font-semibold leading-tight text-text-secondary truncate mt-0.5">
              {email}
            </span>
          </div>

          {/* Context Menu Toggle: Only rendered if the user has management credentials */}
          {hasManagementPermissions && (
            <button
              type="button"
              onClick={() => setActionsExpanded((prev) => !prev)}
              className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-all duration-200 cursor-pointer focus:outline-none ${
                actionsExpanded
                  ? "bg-primary-600 text-white shadow-soft"
                  : "bg-primary-50/80 hover:bg-primary-100 hover:text-primary-600"
              }`}
              aria-label="Toggle user actions"
              aria-expanded={actionsExpanded}
            >
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 12a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          )}
        </div>

        {/* Floating Overlay Action Panel */}
        {actionsExpanded && (
          <div className="absolute left-3 right-3 top-14 z-40 grid grid-cols-2 gap-1.5 rounded-xl bg-surface/98 p-2 border border-primary-100/60 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95">
            {can("user.password.reset") && (
              <button
                type="button"
                onClick={() => {
                  onResetPassword?.(id);
                  setActionsExpanded(false);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-background/80 px-2 py-1.5 text-[10px] sm:text-xs font-extrabold text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
              >
                🔑 Reset
              </button>
            )}

            {can("user.update") && (
              <button
                type="button"
                onClick={() => {
                  onEdit?.(user);
                  setActionsExpanded(false);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-background/80 px-2 py-1.5 text-[10px] sm:text-xs font-extrabold text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
              >
                ✏️ Edit
              </button>
            )}

            {can("user.status.toggle") && (
              <button
                type="button"
                disabled={isMutatingStatus}
                onClick={() => {
                  handleToggleClick();
                  setActionsExpanded(false);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-background/80 px-2 py-1.5 text-[10px] sm:text-xs font-extrabold text-text-secondary hover:text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isActive ? "🚫 Deactivate" : "✅ Activate"}
              </button>
            )}

            {can("user.delete") && (
              <button
                type="button"
                onClick={() => {
                  onDelete?.(id);
                  setActionsExpanded(false);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary-50 px-2 py-1.5 text-[10px] sm:text-xs font-extrabold text-secondary-600 hover:bg-secondary-100 transition-colors cursor-pointer"
              >
                🗑️ Delete
              </button>
            )}
          </div>
        )}

        {/* Meta Footer */}
        <div className="flex items-center justify-between gap-1 border-t border-primary-100/60 pt-2 min-w-0">
          <div className="flex items-center gap-1 shrink-0 select-none">
            <Badge
              value={role || "STAFF"}
              className="text-[9px] px-2 py-0.5 font-black uppercase tracking-wider"
            />
            {/* ✅ SECURITY ADAPTATION: If the user cannot toggle status, render a read-only badge. Otherwise, show nothing because the toggle switch is visible above. */}
            {!can("user.status.toggle") && (
              <Badge
                value={isActive ? "ACTIVE" : "INACTIVE"}
                className="text-[9px] px-2 py-0.5 font-black uppercase tracking-wider"
              />
            )}
          </div>

          <div className="flex min-w-0 max-w-[55%] items-center justify-end rounded-md bg-primary-50/50 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-text-secondary border border-primary-100/40 select-none">
            <span className="truncate">📍 {branch?.name || "Unassigned"}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
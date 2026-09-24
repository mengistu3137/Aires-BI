
import React from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { hasPermission } from "@/permissions/permissions.js";

/**
 * Declarative component for role and permission authorization checks
 *
 * Usage:
 * <Can permission="EXPORT_DATA">
 *   <button>Export to Excel</button>
 * </Can>
 *
 * <Can role={["ADMIN", "MANAGER"]}>
 *   <ManagerControls />
 * </Can>
 */
export const Can = ({ permission, role, children, fallback = null }) => {
	const { role: currentRole, isAuthenticated } = useAuth();

	if (!isAuthenticated || !currentRole) {
		return fallback;
	}

	// 1. Role-based check
	if (role) {
		const rolesArray = Array.isArray(role) ? role : [role];
		if (!rolesArray.includes(currentRole)) {
			return fallback;
		}
	}

	// 2. Permission-based check
	if (permission && !hasPermission(currentRole, permission)) {
		return fallback;
	}

	return <>{children}</>;
};
// 1. React Built-ins
import React from "react";

// 2. Third-Party Packages (Alphabetized)
import { Outlet } from "react-router-dom";

// 3. Absolute Alias Imports (Alphabetized)
import { FeatureLockedPage } from "@/components/feedback/FeatureLockedPage.jsx";
import { useFeatureAccess } from "@/hooks/useFeatureAccess.js";
import { usePermissions } from "@/hooks/usePermissions.js";
import { useTenant } from "@/hooks/useTenant.js";

/**
 * Route guard enforcing SaaS plan entitlements.
 * Allows access if the feature is in the subscription plan,
 * OR if the organization has the boolean flag enabled in the database,
 * OR if the user holds administrative permissions for the module.
 */
export const FeatureRoute = ({ requiredFeature, feature, children }) => {
	const { hasFeature } = useFeatureAccess();
	const { hasInventory, hasKitchenFlow } = useTenant();
	const { can } = usePermissions();

	const target = requiredFeature || feature;

	// Direct evaluation:
	const isEntitled =
		Boolean(target === "INVENTORY" && hasInventory) ||
		Boolean(target === "KITCHEN" && hasKitchenFlow) ||
		Boolean(target && typeof hasFeature === "function" && hasFeature(target)) ||
		Boolean(target === "INVENTORY" && can("inventory.read"));

	// If not entitled, show the upgrade paywall
	if (!isEntitled) {
		return <FeatureLockedPage feature={target} />;
	}

	// Render child page (InventoryPage)
	return children ? children : <Outlet />;
};
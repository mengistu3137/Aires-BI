import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout.jsx";
import { LoginPage } from "@/features/auth/pages/LoginPage.jsx";
import { SurveyorHomePage } from "@/features/survey/pages/SurveyorHomePage.jsx";
import { Survey } from "@/features/survey/pages/Survery.jsx";
import { SurveyProgress } from "@/features/survey/pages/SurveyProgress.jsx";
import { Dashboard } from "@/features/bi/pages/Dashboard.jsx";
import { UsersPage } from "@/features/users/pages/UsersPage.jsx";
import { StoresPage } from "@/features/stores/pages/StoresPage.jsx";
import { ProductsPage } from "@/features/products/pages/ProductsPage.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import { AuditListPage } from "@/features/audits/pages/AuditListPage.jsx";
import { AuditDetailPage } from "@/features/audits/pages/AuditDetailPage.jsx";
import { AuditHistoryPage } from "@/features/audits/pages/AuditHistoryPage.jsx";

import { AuditObservationsPage } from "@/features/observations/pages/AuditObservationsPage.jsx";
import { ObservationDetailPage } from "@/features/observations/pages/ObservationDetailPage.jsx";

import { QueensPricesPage } from "@/features/queens-prices/pages/QueensPricesPage.jsx";
import { CreateQueensPricePage } from "@/features/queens-prices/pages/CreateQueensPricePage.jsx";
import { EditQueensPricePage } from "@/features/queens-prices/pages/EditQueensPricePage.jsx";
import { QueensPriceDetailsPage } from "@/features/queens-prices/pages/QueensPriceDetailsPage.jsx";
import { ProductQueensPricesPage } from "@/features/queens-prices/pages/ProductQueensPricesPage.jsx";

const ProtectedRoute = ({ children, allowedRoles }) => {
	const { isAuthenticated, role } = useAuth();

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	if (allowedRoles && !allowedRoles.includes(role)) {
		return <Navigate to="/survey" replace />;
	}

	return children;
};

export const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginPage />,
	},
	{
		path: "/",
		element: (
			<ProtectedRoute>
				<MainLayout />
			</ProtectedRoute>
		),
		children: [
			{
				index: true,
				element: <Navigate to="/survey" replace />,
			},
			// Field Auditor Primary Home (Phases 2 & 3)
			{
				path: "survey",
				element: <SurveyorHomePage />,
			},
			// Dedicated Store Audit Rapid Collection View
			{
				path: "survey/audit/:assignmentId",
				element: <Survey />,
			},
			// Assignments Overview & Sync Queue
			{
				path: "progress",
				element: <SurveyProgress />,
			},
			// Management & Administration Views (Protected from Auditors)
			{
				path: "dashboard",
				element: (
					<ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
						<Dashboard />
					</ProtectedRoute>
				),
			},
			{
				path: "products",
				element: (
					<ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
						<ProductsPage />
					</ProtectedRoute>
				),
			},
			{
				path: "stores",
				element: (
					<ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
						<StoresPage />
					</ProtectedRoute>
				),
			},
			{
				path: "users",
				element: (
					<ProtectedRoute allowedRoles={["ADMIN"]}>
						<UsersPage />
					</ProtectedRoute>
				),
			},
		],
	},
	{
		path: "*",
		element: <Navigate to="/login" replace />,
	},
]);

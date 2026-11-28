import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/pages/LoginPage.jsx";
import { ChangePasswordPage } from "@/features/auth/pages/ChangePasswordPage.jsx";
import { SurveyorHomePage } from "@/features/survey/pages/SurveyorHomePage.jsx";
import { Survey } from "@/features/survey/pages/Survery.jsx";
import { SurveyProgress } from "@/features/survey/pages/SurveyProgress.jsx";
import { UsersPage } from "@/features/users/pages/UsersPage.jsx";
import { LoginAuditPage } from "@/features/users/pages/LoginAuditPage.jsx";
import { StoresPage } from "@/features/stores/pages/StoresPage.jsx";
import { ProductsPage } from "@/features/products/pages/ProductsPage.jsx";
import { useAuth } from "@/hooks/useAuth.js";

// BI Dashboard Component Import
import { Dashboard } from "@/features/bi/pages/Dashboard.jsx";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage.jsx";

// Audits & Observations Components
import { AuditListPage } from "@/features/audits/pages/AuditListPage.jsx";
import { AuditDetailPage } from "@/features/audits/pages/AuditDetailPage.jsx";
import { AuditHistoryPage } from "@/features/audits/pages/AuditHistoryPage.jsx";
import { AuditObservationsPage } from "@/features/observations/pages/AuditObservationsPage.jsx";
import { ObservationDetailPage } from "@/features/observations/pages/ObservationDetailPage.jsx";
import { ObservationsPage } from "@/features/observations/pages/ObservationsPage.jsx";

// Queens Prices Components
import { QueensPricesPage } from "@/features/queens-prices/pages/QueensPricesPage.jsx";
import { CreateQueensPricePage } from "@/features/queens-prices/pages/CreateQueensPricePage.jsx";
import { EditQueensPricePage } from "@/features/queens-prices/pages/EditQueensPricePage.jsx";
import { QueensPriceDetailsPage } from "@/features/queens-prices/pages/QueensPriceDetailsPage.jsx";
import { ProductQueensPricesPage } from "@/features/queens-prices/pages/ProductQueensPricesPage.jsx";

// Price Analysis Components
import { PriceAnalysisPage } from "@/features/price-analysis/pages/PriceAnalysisPage.jsx";
import { PriceAnalysisDetailPage } from "@/features/price-analysis/pages/PriceAnalysisDetailPage.jsx";

// Alerts Components
import { AlertsPage } from "@/features/alerts/pages/AlertsPage.jsx";
import { AlertDetailPage } from "@/features/alerts/pages/AlertDetailPage.jsx";
import { MainLayout } from "@/components/MainLayout.jsx";

const OFFICE = ["SUPER_ADMIN", "ADMIN", "AIRES_ANALYST", "MANAGER", "QUEENS_GM", "QUEENS_ANALYST"];
const WITH_FIELD = [...OFFICE, "FIELD_AUDITOR"];

const ProtectedRoute = ({ children, allowedRoles }) => {
	const { isAuthenticated, role, isSuperAdmin, user, isImpersonating } = useAuth();

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	if (user?.mustChangePassword && !isImpersonating) {
		return <Navigate to="/change-password" replace />;
	}

	// Aires Super Admin has universal access across all routes
	if (isSuperAdmin || role === "SUPER_ADMIN") {
		return children;
	}

	if (allowedRoles && !allowedRoles.includes(role)) {
		// Redirect field auditors to survey home, everyone else to dashboard
		return (
			<Navigate
				to={role === "FIELD_AUDITOR" ? "/survey" : "/dashboard"}
				replace
			/>
		);
	}

	return children;
};

// Role-based default landing resolver
const DefaultRedirect = () => {
	const { role } = useAuth();
	if (role === "FIELD_AUDITOR") {
		return <Navigate to="/survey" replace />;
	}
	return <Navigate to="/dashboard" replace />;
};

export const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginPage />,
	},
	{
		path: "/change-password",
		element: <ChangePasswordPage />,
	},
	{
		path: "/",
		element: (
			<ProtectedRoute>
				<MainLayout/>
			</ProtectedRoute>
		),
		children: [
			{
				index: true,
				element: <DefaultRedirect />,
			},

			// ── Dashboards ──
			{
				path: "dashboard",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<DashboardPage />
					</ProtectedRoute>
				),
			},
			{
				path: "bi-dashboard",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<Dashboard />
					</ProtectedRoute>
				),
			},

			// ── Field Data Collection & Rapid Audits ──
			{
				path: "survey",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<SurveyorHomePage />
					</ProtectedRoute>
				),
			},
			{
				path: "survey/audit/:assignmentId",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<Survey />
					</ProtectedRoute>
				),
			},
			{
				path: "progress",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<SurveyProgress />
					</ProtectedRoute>
				),
			},

			// ── Master Data ──
			{
				path: "products",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<ProductsPage />
					</ProtectedRoute>
				),
			},
			{
				path: "stores",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<StoresPage />
					</ProtectedRoute>
				),
			},

			// ── Audits & Observations ──
			{
				path: "audits",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<AuditListPage />
					</ProtectedRoute>
				),
			},
			{
				path: "audits/history",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<AuditHistoryPage />
					</ProtectedRoute>
				),
			},
			{
				path: "audits/:auditId",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<AuditDetailPage />
					</ProtectedRoute>
				),
			},
			{
				path: "audits/:auditId/observations",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<AuditObservationsPage />
					</ProtectedRoute>
				),
			},
			{
				path: "observations",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<ObservationsPage />
					</ProtectedRoute>
				),
			},
			{
				path: "observations/:observationId",
				element: (
					<ProtectedRoute
						allowedRoles={WITH_FIELD}
					>
						<ObservationDetailPage />
					</ProtectedRoute>
				),
			},

			// ── Queens Prices ──
			{
				path: "queens-prices",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<QueensPricesPage />
					</ProtectedRoute>
				),
			},
			{
				path: "queens-prices/new",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<CreateQueensPricePage />
					</ProtectedRoute>
				),
			},
			{
				path: "queens-prices/:id",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<QueensPriceDetailsPage />
					</ProtectedRoute>
				),
			},
			{
				path: "queens-prices/:id/edit",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<EditQueensPricePage />
					</ProtectedRoute>
				),
			},
			{
				path: "products/:productId/queens-prices",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<ProductQueensPricesPage />
					</ProtectedRoute>
				),
			},

			// ── Price Analysis ──
			{
				path: "price-analysis",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<PriceAnalysisPage />
					</ProtectedRoute>
				),
			},
			{
				path: "price-analysis/:id",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<PriceAnalysisDetailPage />
					</ProtectedRoute>
				),
			},
			// ── Alerts ──
			{
				path: "alerts",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<AlertsPage />
					</ProtectedRoute>
				),
			},
			{
				path: "alerts/:id",
				element: (
					<ProtectedRoute allowedRoles={OFFICE}>
						<AlertDetailPage />
					</ProtectedRoute>
				),
			},
			// ── Users / Staff Management ──
			{
				path: "users",
				element: (
					<ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
						<UsersPage />
					</ProtectedRoute>
				),
			},
			{
				path: "login-audit",
				element: (
					<ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
						<LoginAuditPage />
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
import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout.jsx";
import { LoginPage } from "@/features/auth/pages/LoginPage.jsx";
import { SurveyorHomePage } from "@/features/survey/pages/SurveyorHomePage.jsx";
import { Survey } from "@/features/survey/pages/Survery.jsx";
import { SurveyProgress } from "@/features/survey/pages/SurveyProgress.jsx";
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

import { PriceAnalysisPage } from "@/features/price-analysis/pages/PriceAnalysisPage.jsx";
import { PriceAnalysisDetailPage } from "@/features/price-analysis/pages/PriceAnalysisDetailPage.jsx";

import { AlertsPage } from "@/features/alerts/pages/AlertsPage.jsx";
import { AlertDetailPage } from "@/features/alerts/pages/AlertDetailPage.jsx";

import { DashboardPage } from "@/features/dashboard/pages/DashboardPage.jsx";

const ProtectedRoute = ({ children, allowedRoles }) => {
	const { isAuthenticated, role } = useAuth();

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Fall back to Dashboard — the safest neutral destination for all roles
    return <Navigate to="/dashboard" replace />;
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
        element: <Navigate to="/dashboard" replace />,
      },

      // ── Dashboard ──
      {
        path: "dashboard",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },

      // ── Field data collection ──
      {
        path: "survey",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <Survey />
          </ProtectedRoute>
        ),
      },
      {
        path: "progress",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <SurveyProgress />
          </ProtectedRoute>
        ),
      },

      // ── Master data ──
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

      // ── Audits ──
      {
        path: "audits",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <AuditListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "audits/history",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <AuditHistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "audits/:auditId",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <AuditDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "audits/:auditId/observations",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <AuditObservationsPage />
          </ProtectedRoute>
        ),
      },

      // ── Observations ──
      // NOTE: There is currently no `/observations` index page component.
      // The nav config exposes "Observations" → /observations which will
      // 404 until an ObservationsPage is added. Only the detail route exists.
      {
        path: "observations/:observationId",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <ObservationDetailPage />
          </ProtectedRoute>
        ),
      },

      // ── Queens Prices ──
      {
        path: "queens-prices",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <QueensPricesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "queens-prices/new",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <CreateQueensPricePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "queens-prices/:id",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <QueensPriceDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "queens-prices/:id/edit",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <EditQueensPricePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "products/:productId/queens-prices",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <ProductQueensPricesPage />
          </ProtectedRoute>
        ),
      },

      // ── Price Analysis ──
      {
        path: "price-analysis",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <PriceAnalysisPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "price-analysis/:id",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <PriceAnalysisDetailPage />
          </ProtectedRoute>
        ),
      },

      // ── Alerts ──
      {
        path: "alerts",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <AlertsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "alerts/:id",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <AlertDetailPage />
          </ProtectedRoute>
        ),
      },

      // ── Users / Staff (Admin only) ──
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

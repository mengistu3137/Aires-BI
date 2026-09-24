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

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect field auditors to survey home, everyone else to dashboard
    return <Navigate to={role === "FIELD_AUDITOR" ? "/survey" : "/dashboard"} replace />;
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
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
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
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "bi-dashboard",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },

      // ── Field Data Collection & Rapid Audits ──
      {
        path: "survey",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <SurveyorHomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "survey/audit/:assignmentId",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <Survey />
          </ProtectedRoute>
        ),
      },
      {
        path: "progress",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <SurveyProgress />
          </ProtectedRoute>
        ),
      },

      // ── Master Data ──
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

      // ── Audits & Observations ──
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
      {
        path: "observations",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FIELD_AUDITOR"]}>
            <ObservationsPage />
          </ProtectedRoute>
        ),
      },
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

      // ── Users / Staff Management ──
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
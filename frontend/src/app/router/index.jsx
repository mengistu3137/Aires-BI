import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/MainLayout.jsx";
import { LoginPage } from "@/features/auth/pages/LoginPage.jsx";
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
      {
        path: "dashboard",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "survey",
        element: <Survey />,
      },
      {
        path: "progress",
        element: <SurveyProgress />,
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
        path: "audits",
        element: <AuditListPage />,
      },
      {
        path: "audits/:auditId",
        element: <AuditDetailPage />,
      },
      {
        path: "audits/history",
        element: <AuditHistoryPage />,
      },
      {
        path: "audits/:auditId/observations",
        element: <AuditObservationsPage />,
      },
      {
        path: "observations/:observationId",
        element: <ObservationDetailPage />,
      },
         {
        path: "observations/:observationId",
        element: <StoresPage />,
      },

      // Inside children:
      {
        path: "queens-prices",
        element: <QueensPricesPage />,
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
        element: <QueensPriceDetailsPage />,
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
        element: <ProductQueensPricesPage />,
      },
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

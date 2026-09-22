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
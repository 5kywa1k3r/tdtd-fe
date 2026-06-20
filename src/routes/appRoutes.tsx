// src/routes/appRoutes.tsx
import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

import { RequireAuth } from "./RequireAuth";
import { RequireRole } from "./RequireRole";
import RouteFallback from "./RouteFallback";
import { Role } from "../constants/roles";
import { UITextKey, uiText } from '../constants/uiText';

const LoginPage = lazy(() =>
  import("../pages/auth/LoginPage").then((module) => ({ default: module.LoginPage })),
);
const MainLayout = lazy(() =>
  import("../layouts/MainLayout").then((module) => ({ default: module.MainLayout })),
);
const DashboardPage = lazy(() => import("../pages/dashboard/DashboardPage"));
const WorkLayout = lazy(() => import("../pages/works/WorkLayoutPage"));
const WorkListPage = lazy(() => import("../pages/works/WorkListPage"));
const WorkDetailPage = lazy(() => import("../pages/works/WorkDetailPage"));
const DynamicExcelListPage = lazy(() => import("../pages/excel/DynamicExcelListPage"));
const DynamicExcelCreatePage = lazy(() => import("../pages/excel/DynamicExcelCreatePage"));
const DynamicExcelViewPage = lazy(() => import("../pages/excel/DynamicExcelViewPage"));
const DynamicExcelEditPage = lazy(() => import("../pages/excel/DynamicExcelEditPage"));
const DynamicFormListPage = lazy(() => import("../pages/dynamicForms/DynamicFormListPage"));
const DynamicFormCreatePage = lazy(() => import("../pages/dynamicForms/DynamicFormCreatePage"));
const DynamicFormViewPage = lazy(() => import("../pages/dynamicForms/DynamicFormViewPage"));
const DynamicFormEditPage = lazy(() => import("../pages/dynamicForms/DynamicFormEditPage"));
const LabelListPage = lazy(() => import("../pages/labels/LabelListPage"));
const AdminAccountsPage = lazy(() => import("../pages/admin/AdminAccountPages"));
const OperationsPage = lazy(() => import("../pages/operations/OperationsPage"));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

function protectedLayout() {
  return (
    <RequireAuth>
      {withSuspense(<MainLayout />)}
    </RequireAuth>
  );
}

export const appRoutes: RouteObject[] = [
  {
    path: "/login",
    element: withSuspense(<LoginPage />),
  },
  {
    path: "/",
    element: protectedLayout(),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: withSuspense(<DashboardPage />) },
      {
        path: "works",
        element: withSuspense(
          <WorkLayout
            type="TASK"
            title="Nhiệm vụ / Chỉ tiêu"
            description="Theo dõi, tạo mới và cập nhật tiến độ nhiệm vụ, chỉ tiêu."
          />,
        ),
        children: [
          { index: true, element: withSuspense(<WorkListPage />) },
          { path: ":id", element: withSuspense(<WorkDetailPage />) },
        ],
      },
      {
        path: "tasks",
        element: withSuspense(
          <WorkLayout
            type="TASK"
            title={uiText(UITextKey.TextGiamSatNhiemVu)}
            description="Theo dõi, tạo mới và cập nhật tiến độ các nhiệm vụ được giao."
          />,
        ),
        children: [
          { index: true, element: withSuspense(<WorkListPage type="TASK" />) },
          { path: ":id", element: withSuspense(<WorkDetailPage type="TASK" />) },
        ],
      },
      {
        path: "indicators",
        element: withSuspense(
          <WorkLayout
            type="INDICATOR"
            title={uiText(UITextKey.TextGiamSatChiTieu)}
            description="Theo dõi, tạo mới và cập nhật tiến độ các chỉ tiêu được giao."
          />,
        ),
        children: [
          { index: true, element: withSuspense(<WorkListPage type="INDICATOR" />) },
          { path: ":id", element: withSuspense(<WorkDetailPage type="INDICATOR" />) },
        ],
      },
      {
        path: "dynamic-excel",
        children: [
          { index: true, element: withSuspense(<DynamicExcelListPage />) },
          { path: "create", element: withSuspense(<DynamicExcelCreatePage />) },
          { path: ":id", element: withSuspense(<DynamicExcelViewPage />) },
          { path: ":id/edit", element: withSuspense(<DynamicExcelEditPage />) },
        ],
      },
      {
        path: "dynamic-forms",
        children: [
          { index: true, element: withSuspense(<DynamicFormListPage />) },
          { path: "create", element: withSuspense(<DynamicFormCreatePage />) },
          { path: ":id", element: withSuspense(<DynamicFormViewPage />) },
          { path: ":id/edit", element: withSuspense(<DynamicFormEditPage />) },
        ],
      },
      {
        path: "labels",
        element: withSuspense(
          <RequireRole allow={[Role.SYSTEM_ADMIN, Role.MANAGER_LEVEL, Role.MANAGER_UNIT]}>
            <LabelListPage />
          </RequireRole>,
        ),
      },
      {
        path: "evaluation-templates",
        element: <Navigate to="/admin/accounts?tab=evaluation" replace />,
      },
      {
        path: "admin/accounts",
        element: withSuspense(
          <RequireRole allow={[Role.SYSTEM_ADMIN, Role.ADMIN, Role.MANAGER_LEVEL, Role.MANAGER_UNIT]}>
            <AdminAccountsPage />
          </RequireRole>,
        ),
      },
      {
        path: "operations",
        element: withSuspense(
          <RequireRole allow={[Role.SYSTEM_ADMIN, Role.ADMIN, Role.MANAGER_LEVEL, Role.MANAGER_UNIT]}>
            <OperationsPage />
          </RequireRole>,
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];

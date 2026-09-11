// src/routes/appRoutes.tsx
import { lazy, Suspense, type ReactNode } from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate, Outlet } from "react-router-dom";

import { AuthListener } from "./AuthListener";
import { LegacyDynamicFormsRedirect } from "./dynamicFormRoutes";
import { LegacyDynamicFlowsRedirect } from "./dynamicFlowRoutes";
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
const StatisticsConfigurationPage = lazy(
  () => import("../pages/works/statistics/StatisticsConfigurationPage"),
);
const StatisticsRunsPage = lazy(() =>
  import('../pages/works/statisticsRun/StatisticsRunPages').then((module) => ({
    default: module.StatisticsRunsPage,
  })),
);
const StatisticsRunDetailPage = lazy(() =>
  import('../pages/works/statisticsRun/StatisticsRunPages').then((module) => ({
    default: module.StatisticsRunDetailPage,
  })),
);
const StatisticsResultPage = lazy(() =>
  import('../pages/works/statisticsRun/StatisticsRunPages').then((module) => ({
    default: module.StatisticsResultPage,
  })),
);
const StatisticsReconciliationsPage = lazy(() =>
  import('../pages/works/reconciliation/ReconciliationPages').then((module) => ({
    default: module.StatisticsReconciliationsPage,
  })),
);
const StatisticsReconciliationDetailPage = lazy(() =>
  import('../pages/works/reconciliation/ReconciliationPages').then((module) => ({
    default: module.StatisticsReconciliationDetailPage,
  })),
);
const DynamicFlowRuntimePage = lazy(
  () => import("../pages/works/flowRuntime/DynamicFlowRuntimePage"),
);
const DynamicExcelListPage = lazy(() => import("../pages/excel/DynamicExcelListPage"));
const DynamicExcelCreatePage = lazy(() => import("../pages/excel/DynamicExcelCreatePage"));
const DynamicExcelViewPage = lazy(() => import("../pages/excel/DynamicExcelViewPage"));
const DynamicExcelEditPage = lazy(() => import("../pages/excel/DynamicExcelEditPage"));
const DynamicFormListPage = lazy(() => import("../pages/dynamicForms/DynamicFormListPage"));
const DynamicFormCreatePage = lazy(() => import("../pages/dynamicForms/DynamicFormCreatePage"));
const DynamicFormViewPage = lazy(() => import("../pages/dynamicForms/DynamicFormViewPage"));
const DynamicFormEditPage = lazy(() => import("../pages/dynamicForms/DynamicFormEditPage"));
const DynamicFlowFamilyListPage = lazy(() => import("../pages/dynamicFlows/DynamicFlowFamilyListPage"));
const DynamicFlowVersionWorkspacePage = lazy(() => import("../pages/dynamicFlows/DynamicFlowVersionWorkspacePage"));
const Nq57TextAggregationPage = lazy(() => import("../pages/nq57/Nq57TextAggregationPage"));
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

export function AuthEventBoundary() {
  return (
    <>
      <AuthListener />
      <Outlet />
    </>
  );
}

const routedPages: RouteObject[] = [
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
          {
            path: ":workId/flow-instances/:instanceId/:tab?",
            element: withSuspense(<DynamicFlowRuntimePage />),
          },
          {
            path: ":workId/statistics/:scopeAssignmentId/config/:tab?",
            element: withSuspense(<StatisticsConfigurationPage />),
          },
          {
            path: ':workId/statistics/:scopeAssignmentId/runs',
            element: withSuspense(<StatisticsRunsPage />),
          },
          {
            path: ':workId/statistics/:scopeAssignmentId/runs/:runId',
            element: withSuspense(<StatisticsRunDetailPage />),
          },
          {
            path: ':workId/statistics/:scopeAssignmentId/results/:resultKind/:resultId',
            element: withSuspense(<StatisticsResultPage />),
          },
          {
            path: ':workId/statistics/:scopeAssignmentId/reconciliations',
            element: withSuspense(<StatisticsReconciliationsPage />),
          },
          {
            path: ':workId/statistics/:scopeAssignmentId/reconciliations/:reconciliationId',
            element: withSuspense(<StatisticsReconciliationDetailPage />),
          },
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
        path: "design/forms",
        children: [
          { index: true, element: withSuspense(<DynamicFormListPage />) },
          { path: "create", element: withSuspense(<DynamicFormCreatePage />) },
          { path: ":id", element: withSuspense(<DynamicFormViewPage />) },
          { path: ":id/edit", element: withSuspense(<DynamicFormEditPage />) },
        ],
      },
      {
        path: "dynamic-forms/*",
        element: <LegacyDynamicFormsRedirect />,
      },
      {
        path: "design/flows",
        children: [
          { index: true, element: withSuspense(<DynamicFlowFamilyListPage />) },
          {
            path: ":familyId/versions/:versionId/:tab?",
            element: withSuspense(<DynamicFlowVersionWorkspacePage />),
          },
        ],
      },
      {
        path: "dynamic-flows/*",
        element: <LegacyDynamicFlowsRedirect />,
      },
      {
        path: "nq57-text-aggregation",
        element: withSuspense(<Nq57TextAggregationPage />),
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

export const appRoutes: RouteObject[] = [
  {
    element: <AuthEventBoundary />,
    children: routedPages,
  },
];

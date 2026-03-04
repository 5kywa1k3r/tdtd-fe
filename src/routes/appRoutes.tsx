// src/routes/appRoutes.tsx
import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';

import { LoginPage } from '../pages/auth/LoginPage';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

import WorkLayout from '../pages/works/WorkLayoutPage';
import WorkListPage from '../pages/works/WorkListPage';
import DynamicExcelCreatePage from '../pages/excel/DynamicExcelCreatePage';
import DynamicExcelViewPage from '../pages/excel/DynamicExcelViewPage';
import DynamicExcelEditPage from '../pages/excel/DynamicExcelEditPage';
import WorkDetailPage from '../pages/works/detail-work-page/WorkDetailPage';
import WorkEditPage from '../pages/works/WorkEditPage';
import DynamicExcelListPage from '../pages/excel/DynamicExcelListPage';
import AdminAccountsPage from '../pages/admin/AdminAccountPages';

import { RequireAuth } from './RequireAuth';
import { RequireRole } from './RequireRole';
import { Role } from '../constants/roles';
// import UploadTestPage from '../features/uploads/UploadTestPage';

export const appRoutes: RouteObject[] = [
  // ====== Auth (public) ======
  {
    path: '/login',
    element: <LoginPage />,
  },

  // ====== App chính (protected) ======
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      // vào "/" thì đá sang "/dashboard"
      { index: true, element: <Navigate to="dashboard" replace /> },

      { path: 'dashboard', element: <DashboardPage /> },
      // { path: 'uploads-test', element: <UploadTestPage /> },
      {
        path: 'tasks',
        element: (
          <WorkLayout
            type="TASK"
            title="Giám sát nhiệm vụ"
            description="Theo dõi, tạo mới và cập nhật tiến độ các nhiệm vụ được giao."
          />
        ),
        children: [
          { index: true, element: <WorkListPage type="TASK" /> },
          { path: ':id', element: <WorkDetailPage type="TASK" /> },
          { path: ':id/edit', element: <WorkEditPage type="TASK" /> },
        ],
      },

      {
        path: 'indicators',
        element: (
          <WorkLayout
            type="INDICATOR"
            title="Giám sát chỉ tiêu"
            description="Theo dõi, tạo mới và cập nhật tiến độ các chỉ tiêu được giao."
          />
        ),
        children: [
          { index: true, element: <WorkListPage type="INDICATOR" /> },
          { path: ':id', element: <WorkDetailPage type="INDICATOR" /> },
          { path: ':id/edit', element: <WorkEditPage type="INDICATOR" /> },
        ],
      },

      { 
        path: "dynamic-excel",
        children: [
          { index: true, element: <DynamicExcelListPage /> },
          { path: "create", element: <DynamicExcelCreatePage /> },
          { path: ":id", element: <DynamicExcelViewPage /> },
          { path: ":id/edit", element: <DynamicExcelEditPage /> },
        ], 
      },
    ],
  },
  // ====== Admin (protected) ======
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      // ...
      {
        path: 'admin/accounts',
        element: (
          <RequireRole allow={[Role.SYSTEM_ADMIN, Role.ADMIN, Role.MANAGER_LEVEL, Role.MANAGER_UNIT]}>
            <AdminAccountsPage />
          </RequireRole>
        ),
      },
    ],
  },
  // ====== fallback ======
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
];

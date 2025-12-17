// src/routes/appRoutes.tsx
import type { RouteObject } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardPage } from '../pages/dashboard/DashboardPage';

import WorkLayout from '../pages/works/WorkLayoutPage';
import WorkListPage from '../pages/works/WorkListPage';
import DynamicExcelPage from '../pages/excel/DynamicExcelPage';
import WorkDetailPage from '../pages/works/detail-work-page/WorkDetailPage';
import WorkEditPage from '../pages/works/WorkEditPage';

export const appRoutes: RouteObject[] = [
  // ====== Auth (không dùng MainLayout) ======
  {
    path: '/login',
    element: <LoginPage />,
  },
  // ====== App chính ======
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },

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
        {
          index: true,
          element: <WorkListPage type="TASK" />,
        },
        {
          path: ':id',
          element: <WorkDetailPage type="TASK" />,
        },
        { 
          path: ':id/edit', 
          element: <WorkEditPage type="TASK" /> 
        },
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
        {
          index: true,
          element: <WorkListPage type="INDICATOR" />,
        },
        {
          path: ':id',
          element: <WorkDetailPage type="INDICATOR" />,
        },
        { 
          path: ':id/edit', 
          element: <WorkEditPage type="INDICATOR" /> 
        },
      ],
    },


      {
        path: 'dynamic-excel',
        element: (
          <DynamicExcelPage/>
        ),
      },
    ],
  },
];

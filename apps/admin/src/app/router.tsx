import { Flex, Spin } from 'antd';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminShell } from '../layouts/AdminShell';
import { ForbiddenPage, NotFoundPage, UnauthorizedPage } from '../routes/error-pages';

const DashboardPage = lazy(() =>
  import('../routes/dashboard-page').then((module) => ({ default: module.DashboardPage })),
);
const ShowcasePage = lazy(() =>
  import('../routes/showcase-page').then((module) => ({ default: module.ShowcasePage })),
);

function RouteLoading() {
  return (
    <Flex justify="center" align="center" style={{ minHeight: 320 }}>
      <Spin size="large" description="加载页面" />
    </Flex>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route element={<AdminShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="showcase" element={<ShowcasePage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

import { Flex, Spin } from 'antd';
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminShell } from '../layouts/AdminShell';
import { RequireSession } from '../features/identity/RequireSession';
import { RequirePermission } from '../features/access/PermissionContext';
import { ForbiddenPage, NotFoundPage, UnauthorizedPage } from '../routes/error-pages';

const DashboardPage = lazy(() =>
  import('../routes/dashboard-page').then((module) => ({ default: module.DashboardPage })),
);
const ShowcasePage = lazy(() =>
  import('../routes/showcase-page').then((module) => ({ default: module.ShowcasePage })),
);
const LoginPage = lazy(() =>
  import('../features/identity/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../features/identity/PasswordResetPages').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('../features/identity/PasswordResetPages').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import('../features/identity/VerifyEmailPage').then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const AccountSecurityPage = lazy(() =>
  import('../features/identity/AccountSecurityPage').then((module) => ({
    default: module.AccountSecurityPage,
  })),
);
const ActiveSessionsPage = lazy(() =>
  import('../features/identity/ActiveSessionsPage').then((module) => ({
    default: module.ActiveSessionsPage,
  })),
);
const UsersPage = lazy(() =>
  import('../features/access/UsersPage').then((module) => ({ default: module.UsersPage })),
);
const RolesPage = lazy(() =>
  import('../features/access/RolesPage').then((module) => ({ default: module.RolesPage })),
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
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password" element={<ResetPasswordPage />} />
        <Route path="verify-email" element={<VerifyEmailPage />} />
        <Route element={<RequireSession />}>
          <Route element={<AdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="showcase" element={<ShowcasePage />} />
            <Route path="account/security" element={<AccountSecurityPage />} />
            <Route path="account/sessions" element={<ActiveSessionsPage />} />
            <Route element={<RequirePermission permissions={['accounts.read']} />}>
              <Route path="access/users" element={<UsersPage />} />
            </Route>
            <Route element={<RequirePermission permissions={['roles.read']} />}>
              <Route path="access/roles" element={<RolesPage />} />
            </Route>
            <Route path="forbidden" element={<ForbiddenPage />} />
            <Route path="unauthorized" element={<UnauthorizedPage />} />
            <Route path="home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

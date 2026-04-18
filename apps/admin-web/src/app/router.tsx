import { Loader } from '@mantine/core';
import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShellLayout } from '../components/app-shell-layout';
import { AuthGuard } from '../components/auth-guard';
import { RoleGuard } from '../components/role-guard';

const DashboardPage = lazy(async () =>
  import('../pages/dashboard-page').then((module) => ({
    default: module.DashboardPage,
  })),
);
const ProvidersPage = lazy(async () =>
  import('../pages/providers-page').then((module) => ({
    default: module.ProvidersPage,
  })),
);
const ProfilePage = lazy(async () =>
  import('../pages/profile-page').then((module) => ({
    default: module.ProfilePage,
  })),
);
const ChatPage = lazy(async () =>
  import('../pages/chat-page').then((module) => ({ default: module.ChatPage })),
);
const UsersPage = lazy(async () =>
  import('../pages/users-page').then((module) => ({
    default: module.UsersPage,
  })),
);
const AnalyticsPage = lazy(async () =>
  import('../pages/analytics-page').then((module) => ({
    default: module.AnalyticsPage,
  })),
);
const HealthPage = lazy(async () =>
  import('../pages/health-page').then((module) => ({
    default: module.HealthPage,
  })),
);
const LoginPage = lazy(async () =>
  import('../pages/login-page').then((module) => ({
    default: module.LoginPage,
  })),
);
const TermsPage = lazy(async () =>
  import('../pages/terms-page').then((module) => ({
    default: module.TermsPage,
  })),
);
const PrivacyPage = lazy(async () =>
  import('../pages/privacy-page').then((module) => ({
    default: module.PrivacyPage,
  })),
);
const RegistrationPage = lazy(async () =>
  import('../pages/registration-page').then((module) => ({
    default: module.RegistrationPage,
  })),
);
const ForgotPasswordPage = lazy(async () =>
  import('../pages/forgot-password-page').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<Loader color="teal" mt="xl" />}>{node}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app" replace />,
  },
  { path: '/login', element: withSuspense(<LoginPage />) },
  { path: '/terms', element: withSuspense(<TermsPage />) },
  { path: '/privacy', element: withSuspense(<PrivacyPage />) },
  { path: '/register', element: withSuspense(<RegistrationPage />) },
  { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <AppShellLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'providers', element: withSuspense(<ProvidersPage />) },
      { path: 'profile', element: withSuspense(<ProfilePage />) },
      { path: 'chat', element: withSuspense(<ChatPage />) },
      {
        path: 'admin/users',
        element: withSuspense(
          <RoleGuard allowedRoles={['admin']}>
            <UsersPage />
          </RoleGuard>,
        ),
      },
      {
        path: 'admin/analytics',
        element: withSuspense(
          <RoleGuard allowedRoles={['admin']}>
            <AnalyticsPage />
          </RoleGuard>,
        ),
      },
      {
        path: 'admin/health',
        element: withSuspense(
          <RoleGuard allowedRoles={['admin']}>
            <HealthPage />
          </RoleGuard>,
        ),
      },
    ],
  },
]);

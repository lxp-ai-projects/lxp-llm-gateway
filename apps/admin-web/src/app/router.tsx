import { createBrowserRouter, Navigate } from 'react-router-dom';

import { AppShellLayout } from '../components/app-shell-layout';
import { AuthGuard } from '../components/auth-guard';
import { RoleGuard } from '../components/role-guard';
import { AnalyticsPage } from '../pages/analytics-page';
import { ChatPage } from '../pages/chat-page';
import { DashboardPage } from '../pages/dashboard-page';
import { ForgotPasswordPage } from '../pages/forgot-password-page';
import { HealthPage } from '../pages/health-page';
import { LoginPage } from '../pages/login-page';
import { PrivacyPage } from '../pages/privacy-page';
import { ProfilePage } from '../pages/profile-page';
import { ProvidersPage } from '../pages/providers-page';
import { RegistrationPage } from '../pages/registration-page';
import { TermsPage } from '../pages/terms-page';
import { UsersPage } from '../pages/users-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app" replace />,
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/register', element: <RegistrationPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <AppShellLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'providers', element: <ProvidersPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'chat', element: <ChatPage /> },
      {
        path: 'admin/users',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <UsersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/analytics',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <AnalyticsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/health',
        element: (
          <RoleGuard allowedRoles={['admin']}>
            <HealthPage />
          </RoleGuard>
        ),
      },
    ],
  },
]);

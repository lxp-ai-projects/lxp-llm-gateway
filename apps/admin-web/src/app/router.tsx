import { Alert, Anchor, Loader, Stack, Text, Title } from '@mantine/core';
import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  useRouteError,
} from 'react-router-dom';

import { AppShellLayout } from '../components/app-shell-layout';
import { AuthGuard } from '../components/auth-guard';
import { RoleGuard } from '../components/role-guard';
import { useSession } from '../lib/use-session';
import { useSetupStatus } from '../lib/use-setup-status';

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
const ImageGenerationPage = lazy(async () =>
  import('../pages/image-generation-page').then((module) => ({
    default: module.ImageGenerationPage,
  })),
);
const VideoGenerationPage = lazy(async () =>
  import('../pages/video-generation-page').then((module) => ({
    default: module.VideoGenerationPage,
  })),
);
const UsersPage = lazy(async () =>
  import('../pages/users-page').then((module) => ({
    default: module.UsersPage,
  })),
);
const TenantsPage = lazy(async () =>
  import('../pages/tenants-page').then((module) => ({
    default: module.TenantsPage,
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
const SetupPage = lazy(async () =>
  import('../pages/setup-page').then((module) => ({
    default: module.SetupPage,
  })),
);

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<Loader color="teal" mt="xl" />}>{node}</Suspense>;
}

function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected application error occurred.';

  return (
    <Stack gap="md" maw={640} mx="auto" mt="xl" p="lg">
      <Title order={2}>Application Error</Title>
      <Text c="dimmed">
        The page could not finish loading because one of the required services
        is unavailable or responding on an unexpected port.
      </Text>
      <Alert color="red" title="Details">
        {message}
      </Alert>
      <Text size="sm">
        Check that `gateway-api` is on `3001`, `admin-api` is on `3002`, and
        `admin-web` is on `3003`, or start the local stack with `docker compose
        -f infra/compose/docker-compose.dev.yml up -d`, then reload the page.
      </Text>
      <Text size="sm" c="dimmed">
        If you are following the self-hosted install path, confirm the published
        images and root `.env` before opening `/setup`.
      </Text>
      <Anchor href="/" underline="hover">
        Return to the app entrypoint
      </Anchor>
    </Stack>
  );
}

function RootEntryGate() {
  const setupStatusQuery = useSetupStatus();
  const sessionQuery = useSession({
    enabled: setupStatusQuery.data?.setupRequired !== true,
  });

  if (setupStatusQuery.isPending) {
    return <Loader color="teal" mt="xl" />;
  }

  if (setupStatusQuery.data?.setupRequired) {
    return <Navigate to="/setup" replace />;
  }

  if (sessionQuery.isPending) {
    return <Loader color="teal" mt="xl" />;
  }

  return <Navigate to={sessionQuery.data ? '/app' : '/login'} replace />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootEntryGate />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/setup',
    element: withSuspense(<SetupPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/login',
    element: withSuspense(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/terms',
    element: withSuspense(<TermsPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/privacy',
    element: withSuspense(<PrivacyPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/register',
    element: withSuspense(<RegistrationPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/forgot-password',
    element: withSuspense(<ForgotPasswordPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <AppShellLayout />
      </AuthGuard>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: withSuspense(<DashboardPage />) },
      { path: 'providers', element: withSuspense(<ProvidersPage />) },
      { path: 'profile', element: withSuspense(<ProfilePage />) },
      { path: 'chat', element: withSuspense(<ChatPage />) },
      { path: 'images', element: withSuspense(<ImageGenerationPage />) },
      { path: 'videos', element: withSuspense(<VideoGenerationPage />) },
      {
        path: 'admin/users',
        element: withSuspense(
          <RoleGuard allowedRoles={['tenant_admin', 'super_admin']}>
            <UsersPage />
          </RoleGuard>,
        ),
      },
      {
        path: 'admin/tenants',
        element: withSuspense(
          <RoleGuard allowedRoles={['super_admin']}>
            <TenantsPage />
          </RoleGuard>,
        ),
      },
      {
        path: 'admin/analytics',
        element: withSuspense(
          <RoleGuard allowedRoles={['tenant_admin', 'super_admin']}>
            <AnalyticsPage />
          </RoleGuard>,
        ),
      },
      {
        path: 'admin/health',
        element: withSuspense(
          <RoleGuard allowedRoles={['tenant_admin', 'super_admin']}>
            <HealthPage />
          </RoleGuard>,
        ),
      },
    ],
  },
]);

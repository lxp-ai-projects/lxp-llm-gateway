import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { test, expect, vi, beforeEach } from 'vitest';

import { adminWebTheme } from '../app/theme';
import { DashboardPage } from './dashboard-page';

const { useRuntimeConfigMock, useSessionMock } = vi.hoisted(() => ({
  useRuntimeConfigMock: vi.fn(),
  useSessionMock: vi.fn(),
}));

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: useRuntimeConfigMock,
}));

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={adminWebTheme}>
        <DashboardPage />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useRuntimeConfigMock.mockReset();
  useSessionMock.mockReset();
});

test('DashboardPage renders the expected overview tiles for an admin session', () => {
  useSessionMock.mockReturnValue({
    data: {
      roles: ['admin'],
    },
  });
  useRuntimeConfigMock.mockReturnValue({
    data: {
      gatewayOnline: true,
      registrationEnabled: true,
    },
  });

  renderDashboard();

  expect(screen.getByText('Session')).toBeInTheDocument();
  expect(screen.getByText('Authenticated')).toBeInTheDocument();
  expect(screen.getByText('Auth posture')).toBeInTheDocument();
  expect(screen.getByText('Cookie-only')).toBeInTheDocument();
  expect(screen.getByText('Gateway')).toBeInTheDocument();
  expect(screen.getByText('Online')).toBeInTheDocument();
  expect(screen.getByText('Role surface')).toBeInTheDocument();
  expect(screen.getByText('Admin + user')).toBeInTheDocument();
  expect(screen.getByText('Registration')).toBeInTheDocument();
  expect(screen.getByText('Enabled')).toBeInTheDocument();
});

test('DashboardPage shows the gateway warning banner when the circuit breaker is active', () => {
  useSessionMock.mockReturnValue({
    data: {
      roles: ['user'],
    },
  });
  useRuntimeConfigMock.mockReturnValue({
    data: {
      gatewayOnline: false,
      registrationEnabled: false,
    },
  });

  renderDashboard();

  expect(screen.getByText('Gateway circuit breaker is active')).toBeInTheDocument();
  expect(screen.getByText('Offline')).toBeInTheDocument();
  expect(screen.getByText('User only')).toBeInTheDocument();
  expect(screen.getByText('Disabled')).toBeInTheDocument();
});

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { test, expect, vi, beforeEach } from 'vitest';

import { adminWebTheme } from '../app/theme';
import { HealthPage } from './health-page';

const {
  getAdminHealthMock,
  getGatewayHealthMock,
  useSessionMock,
} = vi.hoisted(() => ({
  getAdminHealthMock: vi.fn(),
  getGatewayHealthMock: vi.fn(),
  useSessionMock: vi.fn(),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    getHealth: getAdminHealthMock,
  },
  gatewayApiClient: {
    getHealth: getGatewayHealthMock,
  },
}));

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

function renderHealthPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={adminWebTheme}>
        <HealthPage />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getAdminHealthMock.mockReset();
  getGatewayHealthMock.mockReset();
  useSessionMock.mockReset();
  useSessionMock.mockReturnValue({
    data: {
      activeTenantId: 'tenant-1',
      activeTenantSlug: 'tenant-one',
      availableTenants: [
        {
          id: 'tenant-1',
          slug: 'tenant-one',
          displayName: 'Tenant One',
          roles: ['tenant_admin'],
          isDirectMember: true,
        },
      ],
    },
  });
});

test('HealthPage renders healthy admin and gateway statuses', async () => {
  getAdminHealthMock.mockResolvedValue({ status: 'ok' });
  getGatewayHealthMock.mockResolvedValue({ status: 'ok' });

  renderHealthPage();

  expect(
    screen.getByText('Active tenant: Tenant One (tenant-one)'),
  ).toBeInTheDocument();
  expect(await screen.findAllByText('ok')).toHaveLength(2);
  expect(screen.getByText('admin-api')).toBeInTheDocument();
  expect(screen.getByText('gateway-api')).toBeInTheDocument();
});

test('HealthPage renders unavailable when one dependency errors', async () => {
  getAdminHealthMock.mockRejectedValue(new Error('down'));
  getGatewayHealthMock.mockResolvedValue({ status: 'ok' });

  renderHealthPage();

  expect(await screen.findByText('Unavailable')).toBeInTheDocument();
  expect(await screen.findByText('ok')).toBeInTheDocument();
});

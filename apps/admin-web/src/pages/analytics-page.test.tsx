import { screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { AnalyticsPage } from './analytics-page';

const { useSessionMock, getTenantUsageSummaryMock, getTenantUsageByProviderMock, getTenantUsageByModelMock } =
  vi.hoisted(() => ({
    useSessionMock: vi.fn(),
    getTenantUsageSummaryMock: vi.fn(),
    getTenantUsageByProviderMock: vi.fn(),
    getTenantUsageByModelMock: vi.fn(),
  }));

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

vi.mock('../lib/admin-api-client', () => ({
  adminApiClient: {
    getTenantUsageSummary: getTenantUsageSummaryMock,
    getTenantUsageByProvider: getTenantUsageByProviderMock,
    getTenantUsageByModel: getTenantUsageByModelMock,
  },
}));

beforeEach(() => {
  useSessionMock.mockReset();
  getTenantUsageSummaryMock.mockReset();
  getTenantUsageByProviderMock.mockReset();
  getTenantUsageByModelMock.mockReset();

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
  getTenantUsageSummaryMock.mockResolvedValue({
    tenantId: 'tenant-1',
    requests24h: 5,
    requests7d: 12,
    requests30d: 20,
    distinctUsers24h: 3,
    activeUsers30d: 7,
    blockedRequests7d: 2,
    estimatedCostUsd30d: '12.500000',
  });
  getTenantUsageByProviderMock.mockResolvedValue([
    {
      providerId: 'nanogpt',
      requests30d: 8,
      blockedRequests30d: 1,
      estimatedCostUsd30d: '10.250000',
      lastRequestAt: '2026-05-02T10:00:00.000Z',
    },
  ]);
  getTenantUsageByModelMock.mockResolvedValue([
    {
      providerId: 'nanogpt',
      model: 'glm-4.6',
      capability: 'text',
      requests30d: 8,
      blockedRequests30d: 1,
      estimatedCostUsd30d: '10.250000',
      lastRequestAt: '2026-05-02T10:00:00.000Z',
    },
  ]);
});

test('AnalyticsPage renders tenant usage analytics from admin-api', async () => {
  renderWithProviders(<AnalyticsPage />);

  expect(
    screen.getByRole('heading', { name: 'Gateway Analytics' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Active tenant: Tenant One (tenant-one)'),
  ).toBeInTheDocument();
  expect(await screen.findByText('7')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
  expect(screen.getByText('2')).toBeInTheDocument();
  expect(screen.getByText('$12.50')).toBeInTheDocument();
  expect(screen.getByText('Usage by provider')).toBeInTheDocument();
  expect(screen.getAllByText('nanogpt')).toHaveLength(2);
  expect(screen.getByText('glm-4.6')).toBeInTheDocument();
});

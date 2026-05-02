import { screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { AnalyticsPage } from './analytics-page';

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

beforeEach(() => {
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

test('AnalyticsPage renders the phase 1 analytics placeholders', () => {
  renderWithProviders(<AnalyticsPage />);

  expect(
    screen.getByRole('heading', { name: 'Gateway Analytics' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Active tenant: Tenant One (tenant-one)'),
  ).toBeInTheDocument();
  expect(screen.getByText('Active users')).toBeInTheDocument();
  expect(screen.getByText('Distinct gateway users / 24h')).toBeInTheDocument();
  expect(screen.getByText('Gateway requests / 7d')).toBeInTheDocument();
  expect(
    screen.getByText(/dedicated admin analytics endpoints/i),
  ).toBeInTheDocument();
});

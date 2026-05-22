import { screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { SetupPage } from './setup-page';

vi.mock('../lib/use-setup-status', () => ({
  useSetupStatus: () => ({
    isPending: false,
    isError: true,
    error: new Error('admin-api is unreachable'),
    data: undefined,
  }),
}));

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: () => ({
    isPending: false,
    isError: false,
    data: {
      registrationEnabled: false,
      forgotPasswordEnabled: false,
      gatewayOnline: false,
      supportedProviders: [],
    },
  }),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    bootstrapSetup: vi.fn(),
  },
  gatewayApiClient: {
    testSetupProvider: vi.fn(),
  },
}));

test('SetupPage shows an operational message when setup services are unavailable', () => {
  renderWithProviders(<SetupPage />);

  expect(screen.getByText('Setup services are offline')).toBeInTheDocument();
  expect(
    screen.getByText(/docker compose -f infra\/compose\/docker-compose\.dev\.yml up -d/i),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Setup token')).not.toBeInTheDocument();
});

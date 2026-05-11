import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { SetupPage } from './setup-page';

const { bootstrapSetup } = vi.hoisted(() => ({
  bootstrapSetup: vi.fn(async () => ({
    setupCompleted: true,
    tenant: {
      id: 'tenant-1',
      slug: 'laurie-co',
      displayName: 'Laurie Co',
    },
    superAdmin: {
      userUuid: 'user-1',
      email: 'patrick@example.com',
      displayName: 'Patrick',
    },
    openWebUi: {
      clientId: 'open-webui',
      displayName: 'Open WebUI',
      applicationId: 'open-webui',
      scopes: ['chat:completion', 'models:list'],
      trustedForwardedIdentityEnabled: false,
      apiKey: 'lxp_demo_key',
    },
  })),
}));

vi.mock('../lib/use-setup-status', () => ({
  useSetupStatus: () => ({
    isPending: false,
    data: {
      setupRequired: true,
      setupCompleted: false,
      tokenRequired: true,
      version: '0.1.0',
    },
  }),
}));

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: () => ({
    isPending: false,
    data: {
      registrationEnabled: false,
      forgotPasswordEnabled: false,
      gatewayOnline: true,
      supportedProviders: [
        { providerId: 'nanogpt', displayName: 'NanoGPT' },
        { providerId: 'openrouter', displayName: 'OpenRouter' },
      ],
    },
  }),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    bootstrapSetup,
  },
  gatewayApiClient: {
    testSetupProvider: vi.fn(),
  },
}));

vi.mock('../lib/copy-text', () => ({
  copyText: vi.fn(async () => undefined),
}));

test('SetupPage submits the bootstrap payload and shows the completion state', async () => {
  const user = userEvent.setup();

  renderWithProviders(<SetupPage />);

  await user.type(screen.getByLabelText('Setup token'), 'setup-token');
  const displayNameInputs = screen.getAllByLabelText('Display name');
  await user.type(displayNameInputs[0]!, 'Patrick');
  await user.type(screen.getByLabelText('Email'), 'patrick@example.com');
  await user.type(screen.getByLabelText('Password'), 'Sup3rS3cret!');

  await user.type(displayNameInputs[1]!, 'Laurie Co');

  await user.click(
    screen.getByRole('button', { name: 'Complete installation' }),
  );

  expect(bootstrapSetup).toHaveBeenCalledTimes(1);
  expect(await screen.findByText('Installation completed')).toBeInTheDocument();
  expect(await screen.findByText('lxp_demo_key')).toBeInTheDocument();
});

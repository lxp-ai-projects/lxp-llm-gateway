import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ProvidersPage } from './providers-page';

const {
  createOwnProviderCredentialMock,
  getModelsMock,
  getOwnProviderCredentialsMock,
  getOwnProviderSettingsMock,
  updateOwnProviderCredentialMock,
  updateOwnProviderSettingsMock,
} = vi.hoisted(() => ({
  createOwnProviderCredentialMock: vi.fn(async () => ({
    id: 'credential-2',
    userUuid: 'user-1',
    providerId: 'nanogpt',
    providerDisplayName: 'NanoGPT',
    label: 'primary',
    maskedHint: '***oken',
    isActive: true,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
    lastUsedAt: null,
  })),
  getModelsMock: vi.fn(async () => ({
    providerId: 'nanogpt',
    models: [
      { id: 'z-ai/glm-4.6:thinking', displayName: 'GLM 4.6 Thinking' },
      { id: 'mistral-medium', displayName: 'Mistral Medium' },
    ],
  })),
  getOwnProviderCredentialsMock: vi.fn(async () => [
    {
      id: 'credential-1',
      userUuid: 'user-1',
      providerId: 'nanogpt',
      providerDisplayName: 'NanoGPT',
      label: 'primary',
      maskedHint: '***oken',
      isActive: true,
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
      lastUsedAt: null,
    },
  ]),
  getOwnProviderSettingsMock: vi.fn(async () => ({
    userUuid: 'user-1',
    defaultProviderId: 'nanogpt',
    defaultModel: 'z-ai/glm-4.6:thinking',
  })),
  updateOwnProviderCredentialMock: vi.fn(async () => ({
    id: 'credential-1',
    userUuid: 'user-1',
    providerId: 'nanogpt',
    providerDisplayName: 'NanoGPT',
    label: 'main',
    maskedHint: '***oken',
    isActive: true,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
    lastUsedAt: null,
  })),
  updateOwnProviderSettingsMock: vi.fn(async () => ({
    userUuid: 'user-1',
    defaultProviderId: 'nanogpt',
    defaultModel: 'mistral-medium',
  })),
}));

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: () => ({
    data: {
      registrationEnabled: true,
      forgotPasswordEnabled: true,
      gatewayOnline: true,
      supportedProviders: [{ providerId: 'nanogpt', displayName: 'NanoGPT' }],
    },
  }),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    createOwnProviderCredential: createOwnProviderCredentialMock,
    getOwnProviderCredentials: getOwnProviderCredentialsMock,
    getOwnProviderSettings: getOwnProviderSettingsMock,
    updateOwnProviderCredential: updateOwnProviderCredentialMock,
    updateOwnProviderSettings: updateOwnProviderSettingsMock,
  },
  gatewayApiClient: {
    getModels: getModelsMock,
  },
}));

beforeEach(() => {
  createOwnProviderCredentialMock.mockClear();
  getModelsMock.mockClear();
  getOwnProviderCredentialsMock.mockClear();
  getOwnProviderSettingsMock.mockClear();
  updateOwnProviderCredentialMock.mockClear();
  updateOwnProviderSettingsMock.mockClear();
});

test('ProvidersPage lets the user edit their own credential token', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ProvidersPage />);

  await user.click(await screen.findByRole('button', { name: 'Edit' }));

  expect(await screen.findByRole('heading', { name: 'Edit provider credential' })).toBeInTheDocument();

  await user.clear(screen.getByLabelText('Label'));
  await user.type(screen.getByLabelText('Label'), 'main');
  await user.type(screen.getByLabelText('Replace API token'), 'rotated-secret-token');
  await user.click(screen.getByRole('button', { name: 'Update credential' }));

  await waitFor(() =>
    expect(updateOwnProviderCredentialMock).toHaveBeenCalledWith('credential-1', {
      label: 'main',
      apiToken: 'rotated-secret-token',
    }),
  );
});

test('ProvidersPage shows the current gateway defaults and loads models for the selected provider', async () => {
  renderWithProviders(<ProvidersPage />);

  expect(await screen.findByText('Current gateway defaults')).toBeInTheDocument();
  expect(getModelsMock).toHaveBeenCalledWith('nanogpt');
});

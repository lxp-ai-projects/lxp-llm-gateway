import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';

import { adminWebTheme } from '../../../app/theme';
import { useProvidersController } from './use-providers-controller';

const {
  createOwnProviderCredentialMock,
  getModelsMock,
  getOwnProviderCredentialsMock,
  getOwnProviderSettingsMock,
  runtimeConfigData,
  updateOwnProviderCredentialMock,
  updateOwnProviderSettingsMock,
} = vi.hoisted(() => ({
  runtimeConfigData: {
    registrationEnabled: true,
    forgotPasswordEnabled: true,
    gatewayOnline: true,
    supportedProviders: [{ providerId: 'nanogpt', displayName: 'NanoGPT' }],
  },
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

vi.mock('../../../lib/use-runtime-config', () => ({
  useRuntimeConfig: () => ({
    data: runtimeConfigData,
  }),
}));

vi.mock('../../../lib/api-client', () => ({
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={adminWebTheme}>
          <MemoryRouter>{children}</MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  createOwnProviderCredentialMock.mockClear();
  getModelsMock.mockClear();
  getOwnProviderCredentialsMock.mockClear();
  getOwnProviderSettingsMock.mockClear();
  updateOwnProviderCredentialMock.mockClear();
  updateOwnProviderSettingsMock.mockClear();
  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
  ];
  getModelsMock.mockResolvedValue({
    providerId: 'nanogpt',
    models: [
      { id: 'z-ai/glm-4.6:thinking', displayName: 'GLM 4.6 Thinking' },
      { id: 'mistral-medium', displayName: 'Mistral Medium' },
    ],
  });
  getOwnProviderCredentialsMock.mockResolvedValue([
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
  ]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'nanogpt',
    defaultModel: 'z-ai/glm-4.6:thinking',
  });
});

test('useProvidersController creates and updates credentials with proper form resets', async () => {
  const wrapper = createWrapper();
  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.credentials).toHaveLength(1));

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();

  await act(async () => {
    result.current.onApiTokenChange('fresh-secret-token');
    result.current.onLabelChange('primary');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  await waitFor(() =>
    expect(createOwnProviderCredentialMock).toHaveBeenCalledWith({
      providerId: 'nanogpt',
      label: 'primary',
      apiToken: 'fresh-secret-token',
    }),
  );

  await act(async () => {
    result.current.beginCredentialEdit({
      id: 'credential-1',
      providerId: 'nanogpt',
      label: 'main',
    });
    result.current.onApiTokenChange('rotated-secret-token');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  await waitFor(() =>
    expect(updateOwnProviderCredentialMock).toHaveBeenCalledWith(
      'credential-1',
      {
        label: 'main',
        apiToken: 'rotated-secret-token',
      },
    ),
  );

  expect(result.current.editingCredentialId).toBeNull();
  expect(result.current.apiToken).toBe('');
  expect(result.current.label).toBe('primary');
});

test('useProvidersController clears invalid default models and saves dirty defaults', async () => {
  const wrapper = createWrapper();

  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'nanogpt',
    defaultModel: 'missing-model',
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(getModelsMock).toHaveBeenCalledWith('nanogpt'));
  await waitFor(() => expect(result.current.defaultModel).toBeNull());
  expect(result.current.providerSettingsDirty).toBe(true);

  await act(async () => {
    result.current.handleDefaultsSubmit({
      preventDefault() {},
    } as never);
  });

  await waitFor(() =>
    expect(updateOwnProviderSettingsMock).toHaveBeenCalledWith({
      defaultProviderId: 'nanogpt',
      defaultModel: null,
    }),
  );
});

test('useProvidersController surfaces model loading errors and provider fallback labels', async () => {
  const wrapper = createWrapper();

  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'custom-provider',
    defaultModel: null,
  });
  getModelsMock.mockRejectedValue(
    new Error('Provider model registry is offline.'),
  );

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() =>
    expect(result.current.currentDefaultProviderDisplayName).toBe(
      'custom-provider',
    ),
  );
  await waitFor(() =>
    expect(result.current.modelErrorMessage).toBe(
      'Provider model registry is offline.',
    ),
  );

  expect(result.current.defaultProviderOptions).toEqual([
    { label: 'NanoGPT', value: 'nanogpt' },
  ]);
});

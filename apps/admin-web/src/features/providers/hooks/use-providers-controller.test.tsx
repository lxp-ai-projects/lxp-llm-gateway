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
  deleteOwnProviderCredentialMock,
  getImageCatalogMock,
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
  deleteOwnProviderCredentialMock: vi.fn(async () => ({
    deleted: true,
  })),
  getImageCatalogMock: vi.fn(async () => ({
    providers: [
      {
        providerId: 'nanogpt',
        displayName: 'NanoGPT',
        defaultModelId: 'mistral-medium',
        models: [
          { id: 'mistral-medium', displayName: 'Mistral Medium' },
          { id: 'z-ai/glm-4.6:thinking', displayName: 'GLM 4.6 Thinking' },
        ],
      },
      {
        providerId: 'google',
        displayName: 'Google Gemini',
        defaultModelId: 'gemini-3.1-flash-image-preview',
        models: [
          {
            id: 'gemini-3.1-flash-image-preview',
            displayName: 'Gemini 3.1 Flash Image Preview',
          },
        ],
      },
    ],
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
    defaultImageProviderId: 'nanogpt',
    defaultImageModel: 'mistral-medium',
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
    defaultImageProviderId: 'nanogpt',
    defaultImageModel: 'mistral-medium',
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
    deleteOwnProviderCredential: deleteOwnProviderCredentialMock,
    getOwnImageCatalog: getImageCatalogMock,
    getOwnModels: getModelsMock,
    getOwnProviderCredentials: getOwnProviderCredentialsMock,
    getOwnProviderSettings: getOwnProviderSettingsMock,
    updateOwnProviderCredential: updateOwnProviderCredentialMock,
    updateOwnProviderSettings: updateOwnProviderSettingsMock,
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
  deleteOwnProviderCredentialMock.mockClear();
  getImageCatalogMock.mockClear();
  getModelsMock.mockClear();
  getOwnProviderCredentialsMock.mockClear();
  getOwnProviderSettingsMock.mockClear();
  updateOwnProviderCredentialMock.mockClear();
  updateOwnProviderSettingsMock.mockClear();
  runtimeConfigData.supportedProviders = [
    { providerId: 'anthropic', displayName: 'Anthropic Claude' },
    { providerId: 'deepseek', displayName: 'DeepSeek' },
    { providerId: 'google', displayName: 'Google Gemini' },
    { providerId: 'groq', displayName: 'Groq' },
    { providerId: 'mistral', displayName: 'Mistral' },
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'openai', displayName: 'OpenAI' },
    { providerId: 'xai', displayName: 'xAI Grok' },
  ];
  getModelsMock.mockResolvedValue({
    providerId: 'nanogpt',
    models: [
      { id: 'mistral-medium', displayName: 'Mistral Medium' },
      { id: 'z-ai/glm-4.6:thinking', displayName: 'GLM 4.6 Thinking' },
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
    defaultImageProviderId: 'nanogpt',
    defaultImageModel: 'mistral-medium',
  });
  getImageCatalogMock.mockResolvedValue({
    providers: [
      {
        providerId: 'nanogpt',
        displayName: 'NanoGPT',
        defaultModelId: 'mistral-medium',
        models: [
          { id: 'mistral-medium', displayName: 'Mistral Medium' },
          { id: 'z-ai/glm-4.6:thinking', displayName: 'GLM 4.6 Thinking' },
        ],
      },
      {
        providerId: 'google',
        displayName: 'Google Gemini',
        defaultModelId: 'gemini-3.1-flash-image-preview',
        models: [
          {
            id: 'gemini-3.1-flash-image-preview',
            displayName: 'Gemini 3.1 Flash Image Preview',
          },
        ],
      },
    ],
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
  expect(result.current.providerOptions).toEqual([
    { label: 'Anthropic Claude', value: 'anthropic' },
    { label: 'DeepSeek', value: 'deepseek' },
    { label: 'Google Gemini', value: 'google' },
    { label: 'Groq', value: 'groq' },
    { label: 'Mistral', value: 'mistral' },
    { label: 'NanoGPT', value: 'nanogpt' },
    { label: 'OpenAI', value: 'openai' },
    { label: 'xAI Grok', value: 'xai' },
  ]);
});

test('useProvidersController blocks Google Gemini credentials without an API token', async () => {
  const wrapper = createWrapper();

  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'google', displayName: 'Google Gemini' },
  ];
  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.providerOptions).toHaveLength(2));

  await act(async () => {
    result.current.onProviderChange('google');
    result.current.onLabelChange('gemini-primary');
    result.current.onBaseUrlChange(
      'https://generativelanguage.googleapis.com/v1beta/openai',
    );
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
  expect(result.current.credentialValidationError).toBe(
    'Google Gemini credentials require an API token.',
  );
});

test('useProvidersController clears invalid default models and saves dirty defaults', async () => {
  const wrapper = createWrapper();

  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'nanogpt',
    defaultModel: 'missing-model',
    defaultImageProviderId: null,
    defaultImageModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(getModelsMock).toHaveBeenCalledWith('nanogpt'));
  await waitFor(() => expect(result.current.defaultModel).toBeNull());
  expect(result.current.providerSettingsDirty).toBe(true);
  expect(result.current.defaultModelOptions).toEqual([
    { label: 'GLM 4.6 Thinking', value: 'z-ai/glm-4.6:thinking' },
    { label: 'Mistral Medium', value: 'mistral-medium' },
  ]);

  await act(async () => {
    result.current.handleDefaultsSubmit({
      preventDefault() {},
    } as never);
  });

  await waitFor(() =>
    expect(updateOwnProviderSettingsMock).toHaveBeenCalledWith({
      defaultProviderId: 'nanogpt',
      defaultModel: null,
      defaultImageProviderId: null,
      defaultImageModel: null,
    }),
  );
});

test('useProvidersController surfaces model loading errors and provider fallback labels', async () => {
  const wrapper = createWrapper();

  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'custom-provider',
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
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
  expect(result.current.defaultImageProviderOptions).toEqual([
    { label: 'NanoGPT', value: 'nanogpt' },
  ]);
});

test('useProvidersController surfaces provider credential conflicts clearly', async () => {
  const wrapper = createWrapper();
  const conflictMessage =
    'A credential already exists for this provider/label. Use Edit to update it, or delete the existing credential first.';

  createOwnProviderCredentialMock.mockRejectedValueOnce(new Error(conflictMessage));
  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.providerOptions).not.toHaveLength(0));

  await act(async () => {
    result.current.onProviderChange('nanogpt');
    result.current.onLabelChange('primary');
    result.current.onApiTokenChange('nano-secret-token');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  await waitFor(() =>
    expect(result.current.credentialSubmitError).toBe(conflictMessage),
  );
});

test('useProvidersController blocks Ollama cloud credentials without an API token', async () => {
  const wrapper = createWrapper();

  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'ollama', displayName: 'Ollama' },
  ];
  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.providerOptions).toHaveLength(2));

  await act(async () => {
    result.current.onProviderChange('ollama');
    result.current.onLabelChange('ollama-cloud');
    result.current.onBaseUrlChange('https://ollama.com');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
  expect(result.current.credentialValidationError).toBe(
    'Ollama cloud credentials on ollama.com require an API token.',
  );
});

test('useProvidersController blocks xAI Grok credentials without an API token', async () => {
  const wrapper = createWrapper();

  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'xai', displayName: 'xAI Grok' },
  ];
  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.providerOptions).toHaveLength(2));

  await act(async () => {
    result.current.onProviderChange('xai');
    result.current.onLabelChange('grok-primary');
    result.current.onBaseUrlChange('https://api.x.ai/v1');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
  expect(result.current.credentialValidationError).toBe(
    'xAI Grok credentials require an API token.',
  );
});

test('useProvidersController blocks OpenAI credentials without an API token', async () => {
  const wrapper = createWrapper();

  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'openai', displayName: 'OpenAI' },
  ];
  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.providerOptions).toHaveLength(2));

  await act(async () => {
    result.current.onProviderChange('openai');
    result.current.onLabelChange('openai-primary');
    result.current.onBaseUrlChange('https://api.openai.com/v1');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
  expect(result.current.credentialValidationError).toBe(
    'OpenAI credentials require an API token.',
  );
});

test('useProvidersController blocks Anthropic credentials without an API token', async () => {
  const wrapper = createWrapper();

  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'anthropic', displayName: 'Anthropic Claude' },
  ];
  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.providerOptions).toHaveLength(2));

  await act(async () => {
    result.current.onProviderChange('anthropic');
    result.current.onLabelChange('anthropic-primary');
    result.current.onBaseUrlChange('https://api.anthropic.com');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
  expect(result.current.credentialValidationError).toBe(
    'Anthropic credentials require an API token.',
  );
});

test('useProvidersController blocks Mistral credentials without an API token', async () => {
  const wrapper = createWrapper();

  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'mistral', displayName: 'Mistral' },
  ];
  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.providerOptions).toHaveLength(2));

  await act(async () => {
    result.current.onProviderChange('mistral');
    result.current.onLabelChange('mistral-primary');
    result.current.onBaseUrlChange('https://api.mistral.ai/v1');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
  expect(result.current.credentialValidationError).toBe(
    'Mistral credentials require an API token.',
  );
});

test('useProvidersController blocks DeepSeek credentials without an API token', async () => {
  const wrapper = createWrapper();

  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'deepseek', displayName: 'DeepSeek' },
  ];
  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  const { result } = renderHook(() => useProvidersController(), { wrapper });

  await waitFor(() => expect(result.current.providerOptions).toHaveLength(2));

  await act(async () => {
    result.current.onProviderChange('deepseek');
    result.current.onLabelChange('deepseek-primary');
    result.current.onBaseUrlChange('https://api.deepseek.com/v1');
  });

  await act(async () => {
    result.current.handleCredentialSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
  expect(result.current.credentialValidationError).toBe(
    'DeepSeek credentials require an API token.',
  );
});

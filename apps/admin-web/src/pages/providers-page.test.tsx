import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ProvidersPage } from './providers-page';

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

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: () => ({
    data: runtimeConfigData,
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
  runtimeConfigData.supportedProviders = [
    { providerId: 'nanogpt', displayName: 'NanoGPT' },
    { providerId: 'ollama', displayName: 'Ollama' },
    { providerId: 'groq', displayName: 'Groq' },
    { providerId: 'google', displayName: 'Google Gemini' },
    { providerId: 'xai', displayName: 'xAI Grok' },
    { providerId: 'openai', displayName: 'OpenAI' },
    { providerId: 'anthropic', displayName: 'Anthropic Claude' },
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

test('ProvidersPage lets the user edit their own credential token', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ProvidersPage />);

  await user.click(await screen.findByRole('button', { name: 'Edit' }));

  expect(
    await screen.findByRole('heading', { name: 'Edit provider credential' }),
  ).toBeInTheDocument();

  await user.clear(screen.getByLabelText('Label'));
  await user.type(screen.getByLabelText('Label'), 'main');
  await user.type(
    screen.getByLabelText('Replace API token'),
    'rotated-secret-token',
  );
  await user.click(screen.getByRole('button', { name: 'Update credential' }));

  await waitFor(() =>
    expect(updateOwnProviderCredentialMock).toHaveBeenCalledWith(
      'credential-1',
      {
        label: 'main',
        apiToken: 'rotated-secret-token',
      },
    ),
  );
}, 20_000);

test('ProvidersPage shows the current gateway defaults and loads models for the selected provider', async () => {
  renderWithProviders(<ProvidersPage />);

  expect(
    await screen.findByText('Current gateway defaults'),
  ).toBeInTheDocument();
  expect(getModelsMock).toHaveBeenCalledWith('nanogpt');
});

test('ProvidersPage creates a new credential and ignores empty submit payloads', async () => {
  const user = userEvent.setup();

  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  renderWithProviders(<ProvidersPage />);

  expect(
    await screen.findByText(
      'No credentials saved yet. Add one before setting gateway defaults.',
    ),
  ).toBeInTheDocument();

  const saveCredentialButton = screen.getByRole('button', {
    name: 'Save credential',
  });
  expect(saveCredentialButton).toBeDisabled();

  const credentialHeading = screen.getByRole('heading', {
    name: 'Add provider credential',
  });
  const credentialForm = credentialHeading.closest('form');
  expect(credentialForm).not.toBeNull();

  fireEvent.submit(credentialForm!);
  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();

  await user.type(screen.getByLabelText('API token'), 'fresh-secret-token');
  await user.click(saveCredentialButton);

  await waitFor(() =>
    expect(createOwnProviderCredentialMock).toHaveBeenCalledWith({
      providerId: 'nanogpt',
      label: 'primary',
      apiToken: 'fresh-secret-token',
    }),
  );
});

test('ProvidersPage cancels credential edit mode and resets the form', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ProvidersPage />);

  await user.click(await screen.findByRole('button', { name: 'Edit' }));
  expect(
    await screen.findByRole('heading', { name: 'Edit provider credential' }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Cancel edit' }));

  expect(
    await screen.findByRole('heading', { name: 'Add provider credential' }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Label')).toHaveValue('primary');
  expect(screen.getByLabelText('API token')).toHaveValue('');
});

test('ProvidersPage clears an invalid default model and saves gateway defaults', async () => {
  const user = userEvent.setup();

  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'nanogpt',
    defaultModel: 'model-that-no-longer-exists',
  });

  renderWithProviders(<ProvidersPage />);

  await screen.findByText('Current gateway defaults');
  await waitFor(() => expect(getModelsMock).toHaveBeenCalledWith('nanogpt'));

  const saveDefaultsButton = screen.getByRole('button', {
    name: 'Save defaults',
  });
  await waitFor(() => expect(saveDefaultsButton).toBeEnabled());
  await user.click(saveDefaultsButton);

  await waitFor(() =>
    expect(updateOwnProviderSettingsMock).toHaveBeenCalledWith({
      defaultProviderId: 'nanogpt',
      defaultModel: null,
    }),
  );
});

test('ProvidersPage surfaces model loading failures and raw provider fallback names', async () => {
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'custom-provider',
    defaultModel: null,
  });
  getModelsMock.mockRejectedValue(
    new Error('NanoGPT model directory is offline.'),
  );

  renderWithProviders(<ProvidersPage />);

  const currentDefaults = await screen.findByText('Current gateway defaults');
  const defaultsAlert = currentDefaults.closest('[role="alert"]');
  expect(defaultsAlert).not.toBeNull();
  expect(
    within(defaultsAlert!).getByText(/Provider: custom-provider/),
  ).toBeInTheDocument();

  expect(await screen.findByText('Model loading failed')).toBeInTheDocument();
  expect(
    screen.getByText('NanoGPT model directory is offline.'),
  ).toBeInTheDocument();
});

test('ProvidersPage shows an xAI model access note when model loading fails', async () => {
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'xai',
    defaultModel: null,
  });
  getModelsMock.mockRejectedValue(
    new Error('xAI model listing failed with status 500: Internal server error'),
  );

  renderWithProviders(<ProvidersPage />);

  expect(await screen.findByText('Model loading failed')).toBeInTheDocument();
  expect(
    screen.getByText(
      /xAI's models endpoint returns the models available to the authenticating API key/i,
    ),
  ).toBeInTheDocument();
});

test('ProvidersPage marks default providers in both mobile and desktop credential views', async () => {
  renderWithProviders(<ProvidersPage />);

  expect(
    await screen.findByText('Current gateway defaults'),
  ).toBeInTheDocument();

  const defaultProviderLabels = await screen.findAllByText('Default provider');
  expect(defaultProviderLabels.length).toBeGreaterThanOrEqual(2);
});

test('ProvidersPage creates an Ollama endpoint credential with a base URL', async () => {
  const user = userEvent.setup();

  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  createOwnProviderCredentialMock.mockResolvedValueOnce({
    id: 'credential-ollama-1',
    userUuid: 'user-1',
    providerId: 'ollama',
    providerDisplayName: 'Ollama',
    label: 'local-ollama',
    maskedHint: 'http://127.0.0.1:11434/v1',
    isActive: true,
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
    lastUsedAt: null,
  });

  renderWithProviders(<ProvidersPage />);

  await screen.findByRole('heading', { name: 'Add provider credential' });

  await user.selectOptions(screen.getByLabelText('Provider'), 'ollama');

  expect(
    screen.getByText('Endpoint-based credential'),
  ).toBeInTheDocument();

  await user.clear(screen.getByLabelText('Label'));
  await user.type(screen.getByLabelText('Label'), 'local-ollama');
  await user.type(
    screen.getByLabelText('Base URL'),
    'http://127.0.0.1:11434/v1',
  );
  await user.click(screen.getByRole('button', { name: 'Save credential' }));

  await waitFor(() =>
    expect(createOwnProviderCredentialMock).toHaveBeenCalledWith({
      providerId: 'ollama',
      label: 'local-ollama',
      apiToken: undefined,
      baseUrl: 'http://127.0.0.1:11434/v1',
    }),
  );
}, 20_000);

test('ProvidersPage blocks Ollama Cloud credentials without an API token', async () => {
  const user = userEvent.setup();

  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  renderWithProviders(<ProvidersPage />);

  await screen.findByRole('heading', { name: 'Add provider credential' });

  await user.selectOptions(screen.getByLabelText('Provider'), 'ollama');
  await user.clear(screen.getByLabelText('Label'));
  await user.type(screen.getByLabelText('Label'), 'ollama-cloud');
  await user.type(screen.getByLabelText('Base URL'), 'https://ollama.com');
  await user.click(screen.getByRole('button', { name: 'Save credential' }));

  expect(
    await screen.findByText(
      'Ollama cloud credentials on ollama.com require an API token.',
    ),
  ).toBeInTheDocument();
  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
});

test('ProvidersPage shows the xAI Grok billing warning and blocks missing tokens', async () => {
  const user = userEvent.setup();

  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  renderWithProviders(<ProvidersPage />);

  await screen.findByRole('heading', { name: 'Add provider credential' });

  await user.selectOptions(screen.getByLabelText('Provider'), 'xai');
  await waitFor(() =>
    expect(document.body.textContent ?? '').toMatch(
      /xAI Grok support is certified.*usage is billed through your xAI account/i,
    ),
  );

  await user.clear(screen.getByLabelText('Label'));
  await user.type(screen.getByLabelText('Label'), 'grok-primary');
  await user.type(screen.getByLabelText('Base URL'), 'https://api.x.ai/v1');
  await user.click(screen.getByRole('button', { name: 'Save credential' }));

  expect(
    await screen.findByText('xAI Grok credentials require an API token.'),
  ).toBeInTheDocument();
  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
});

test('ProvidersPage shows the Google Gemini billing warning and blocks missing tokens', async () => {
  const user = userEvent.setup();

  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  renderWithProviders(<ProvidersPage />);

  await screen.findByRole('heading', { name: 'Add provider credential' });

  await user.selectOptions(screen.getByLabelText('Provider'), 'google');
  expect(
    screen.getByText(
      /Google Gemini support is validated.*free tier is subject to Google's rate limits.*usage is billed through your Google AI account/i,
    ),
  ).toBeInTheDocument();

  await user.clear(screen.getByLabelText('Label'));
  await user.type(screen.getByLabelText('Label'), 'gemini-primary');
  await user.type(
    screen.getByLabelText('Base URL'),
    'https://generativelanguage.googleapis.com/v1beta/openai',
  );
  await user.click(screen.getByRole('button', { name: 'Save credential' }));

  expect(
    await screen.findByText('Google Gemini credentials require an API token.'),
  ).toBeInTheDocument();
  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
});

test('ProvidersPage shows the OpenAI billing warning and blocks missing tokens', async () => {
  const user = userEvent.setup();

  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  renderWithProviders(<ProvidersPage />);

  await screen.findByRole('heading', { name: 'Add provider credential' });

  await user.selectOptions(screen.getByLabelText('Provider'), 'openai');
  expect(
    screen.getByText(
      /OpenAI support is experimental.*usage is billed through your OpenAI account/i,
    ),
  ).toBeInTheDocument();

  await user.clear(screen.getByLabelText('Label'));
  await user.type(screen.getByLabelText('Label'), 'openai-primary');
  await user.type(
    screen.getByLabelText('Base URL'),
    'https://api.openai.com/v1',
  );
  await user.click(screen.getByRole('button', { name: 'Save credential' }));

  expect(
    await screen.findByText('OpenAI credentials require an API token.'),
  ).toBeInTheDocument();
  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
});

test('ProvidersPage shows the Anthropic billing warning and blocks missing tokens', async () => {
  const user = userEvent.setup();

  getOwnProviderCredentialsMock.mockResolvedValue([]);
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: null,
    defaultModel: null,
  });

  renderWithProviders(<ProvidersPage />);

  await screen.findByRole('heading', { name: 'Add provider credential' });

  await user.selectOptions(screen.getByLabelText('Provider'), 'anthropic');
  expect(
    screen.getByText(
      /Anthropic support is experimental.*usage is billed through your Anthropic account/i,
    ),
  ).toBeInTheDocument();

  await user.clear(screen.getByLabelText('Label'));
  await user.type(screen.getByLabelText('Label'), 'anthropic-primary');
  await user.type(
    screen.getByLabelText('Base URL'),
    'https://api.anthropic.com',
  );
  await user.click(screen.getByRole('button', { name: 'Save credential' }));

  expect(
    await screen.findByText('Anthropic credentials require an API token.'),
  ).toBeInTheDocument();
  expect(createOwnProviderCredentialMock).not.toHaveBeenCalled();
});

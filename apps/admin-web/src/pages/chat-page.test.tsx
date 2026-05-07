import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ChatPage } from './chat-page';

const {
  getSessionMock,
  getOwnProviderSettingsMock,
  chatStreamMock,
  deleteConversationMock,
  exportConversationArchiveMock,
  exportConversationMock,
  getModelsMock,
  importConversationFileMock,
  loadConversationsMock,
  saveConversationMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(async () => ({
    userUuid: 'user-1',
    email: 'patrick@example.com',
    displayName: 'Patrick',
    status: 'active',
    activeTenantId: 'tenant-1',
    activeTenantSlug: 'lxp-internal',
    roles: ['tenant_admin'],
    globalRoles: [],
    availableTenants: [
      {
        id: 'tenant-1',
        slug: 'lxp-internal',
        displayName: 'LXP Internal',
        roles: ['tenant_admin'],
        isDirectMember: true,
      },
    ],
  })),
  getOwnProviderSettingsMock: vi.fn(async () => ({
    userUuid: 'user-1',
    defaultProviderId: 'nanogpt',
    defaultModel: 'z-ai/glm-4.6:thinking',
  })),
  chatStreamMock: vi.fn(async () => ({
    requestId: 'request-1',
    receivedReasoning: false,
    receivedContent: false,
    finishReason: 'stop',
  })),
  deleteConversationMock: vi.fn(async () => undefined),
  exportConversationArchiveMock: vi.fn(async () => ({
    blob: new Blob(['archive']),
    fileName: 'archive.zip',
  })),
  exportConversationMock: vi.fn(async () => ({
    blob: new Blob(['conversation']),
    fileName: 'conversation.json',
  })),
  getModelsMock: vi.fn(async () => ({
    providerId: 'nanogpt',
    models: [{ id: 'z-ai/glm-4.6:thinking', displayName: 'GLM 4.6 Thinking' }],
  })),
  importConversationFileMock: vi.fn(async () => ({
    conversations: [],
  })),
  loadConversationsMock: vi.fn(async () => []),
  saveConversationMock: vi.fn(async () => undefined),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    getSession: getSessionMock,
    getOwnProviderSettings: getOwnProviderSettingsMock,
    exportConversation: exportConversationMock,
    exportConversationArchive: exportConversationArchiveMock,
    getRuntimeConfig: vi.fn(async () => ({
      registrationEnabled: true,
      forgotPasswordEnabled: true,
      gatewayOnline: true,
        supportedProviders: [
          { providerId: 'nanogpt', displayName: 'NanoGPT' },
          { providerId: 'openrouter', displayName: 'OpenRouter' },
          { providerId: 'ollama', displayName: 'Ollama' },
          { providerId: 'groq', displayName: 'Groq' },
          { providerId: 'google', displayName: 'Google Gemini' },
          { providerId: 'mistral', displayName: 'Mistral' },
          { providerId: 'deepseek', displayName: 'DeepSeek' },
          { providerId: 'moonshot', displayName: 'Moonshot / Kimi' },
          { providerId: 'openai', displayName: 'OpenAI' },
          { providerId: 'anthropic', displayName: 'Anthropic Claude' },
          { providerId: 'xai', displayName: 'xAI Grok' },
          { providerId: 'zai', displayName: 'Z.ai' },
        ],
    })),
    importConversationFile: importConversationFileMock,
  },
  gatewayApiClient: {
    getModels: getModelsMock,
    chatStream: chatStreamMock,
  },
}));

vi.mock('../lib/chat-store', () => ({
  deleteConversation: deleteConversationMock,
  loadConversations: loadConversationsMock,
  saveConversation: saveConversationMock,
}));

beforeEach(() => {
  getSessionMock.mockClear();
  getOwnProviderSettingsMock.mockClear();
  chatStreamMock.mockClear();
  deleteConversationMock.mockClear();
  exportConversationArchiveMock.mockClear();
  exportConversationMock.mockClear();
  getModelsMock.mockClear();
  importConversationFileMock.mockClear();
  loadConversationsMock.mockReset();
  loadConversationsMock.mockResolvedValue([]);
  saveConversationMock.mockClear();
  getOwnProviderSettingsMock.mockResolvedValue({
    userUuid: 'user-1',
    defaultProviderId: 'nanogpt',
    defaultModel: 'z-ai/glm-4.6:thinking',
  });
  getModelsMock.mockImplementation(async (providerId?: string) => {
    if (providerId === 'openrouter') {
      return {
        providerId: 'openrouter',
        models: [
          { id: 'openrouter/auto', displayName: 'OpenRouter Auto' },
          { id: 'z-ai/glm-4.5', displayName: 'Z.ai GLM 4.5' },
        ],
      };
    }

    if (providerId === 'ollama') {
      return {
        providerId: 'ollama',
        models: [
          { id: 'qwen3:8b', displayName: 'Qwen3 8B' },
          { id: 'glm-4.5', displayName: 'GLM 4.5' },
        ],
      };
    }

    if (providerId === 'xai') {
      return {
        providerId: 'xai',
        models: [
          { id: 'grok-4-fast', displayName: 'Grok 4 Fast' },
          { id: 'grok-4', displayName: 'Grok 4' },
        ],
      };
    }

    if (providerId === 'openai') {
      return {
        providerId: 'openai',
        models: [
          { id: 'gpt-4o', displayName: 'GPT-4o' },
          { id: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini' },
        ],
      };
    }

    if (providerId === 'google') {
      return {
        providerId: 'google',
        models: [
          { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
          { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
        ],
      };
    }

    if (providerId === 'anthropic') {
      return {
        providerId: 'anthropic',
        models: [
          {
            id: 'claude-haiku-4-5-20251001',
            displayName: 'Claude Haiku 4.5',
          },
          {
            id: 'claude-sonnet-4-20250514',
            displayName: 'Claude Sonnet 4',
          },
          {
            id: 'claude-opus-4-1-20250805',
            displayName: 'Claude Opus 4.1',
          },
        ],
      };
    }

    if (providerId === 'zai') {
      return {
        providerId: 'zai',
        models: [
          { id: 'glm-4.5', displayName: 'GLM-4.5' },
          { id: 'glm-4-32b-0414-128k', displayName: 'GLM-4 32B 0414 128K' },
        ],
      };
    }

    return {
      providerId: 'nanogpt',
      models: [
        { id: 'z-ai/glm-4.6:thinking', displayName: 'GLM 4.6 Thinking' },
      ],
    };
  });
});

test('ChatPage submits on Enter from the composer', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  const composer = await screen.findByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Test prompt{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));

  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'nanogpt',
      model: 'z-ai/glm-4.6:thinking',
      stream: true,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Follow the application base guardrails and safety constraints.',
        },
        {
          role: 'user',
          content: 'Test prompt',
        },
      ],
    }),
    expect.any(Object),
  );
}, 10_000);

test('ChatPage sends Z.ai thinking settings and prior reasoning with the chat request', async () => {
  const user = userEvent.setup();

  loadConversationsMock.mockResolvedValue([
    {
      id: 'conversation-zai-1',
      title: 'Z.ai thread',
      model: 'glm-4.5',
      providerId: 'zai',
      systemPrompt: 'You are a helpful assistant.',
      providerOptions: {
        zai: {
          thinking: {
            type: 'enabled',
            clearThinking: false,
          },
        },
      },
      updatedAt: '2026-04-16T00:00:00.000Z',
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Earlier answer',
          reasoning: 'Earlier reasoning trace',
          createdAt: '2026-04-16T00:01:00.000Z',
        },
      ],
    },
  ]);

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  expect(
    await screen.findByText(
      /Preserve prior reasoning keeps `clear_thinking` disabled/i,
    ),
  ).toBeInTheDocument();

  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Use Z.ai thinking{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'zai',
      model: 'glm-4.5',
      providerOptions: {
        zai: {
          thinking: {
            type: 'enabled',
            clearThinking: false,
          },
        },
      },
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        {
          role: 'assistant',
          content: 'Earlier answer',
          reasoningContent: 'Earlier reasoning trace',
        },
        { role: 'user', content: 'Use Z.ai thinking' },
      ],
    }),
    expect.any(Object),
  );
}, 10_000);

test('ChatPage exposes GLM thinking controls for NanoGPT Z.ai routes', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  expect(
    await screen.findByText('NanoGPT GLM thinking'),
  ).toBeInTheDocument();

  await user.click(screen.getByTestId('chat-thinking-mode-select'));
  const preserveOption = document.querySelector(
    '[role="option"][value="enabled-preserve"]',
  ) as HTMLElement | null;
  expect(preserveOption).not.toBeNull();
  await user.click(preserveOption!);

  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Use NanoGPT GLM thinking{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'nanogpt',
      model: 'z-ai/glm-4.6:thinking',
      providerOptions: {
        zai: {
          thinking: {
            type: 'enabled',
            clearThinking: false,
          },
        },
      },
    }),
    expect.any(Object),
  );
});

test('ChatPage disables Z.ai thinking for models below GLM 4.5', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  await user.click(screen.getByTestId('chat-provider-select'));
  const zaiOption = document.querySelector(
    '[role="option"][value="zai"]',
  ) as HTMLElement | null;
  expect(zaiOption).not.toBeNull();
  await user.click(zaiOption!);

  await user.click(screen.getByTestId('chat-model-select'));
  const olderGlmOption = document.querySelector(
    '[role="option"][value="glm-4-32b-0414-128k"]',
  ) as HTMLElement | null;
  expect(olderGlmOption).not.toBeNull();
  await user.click(olderGlmOption!);

  expect(
    await screen.findByText(/The selected model \(.+\) does not appear to support GLM 4\.5\+ thinking in this provider route/i),
  ).toBeInTheDocument();
  expect(screen.getByTestId('chat-thinking-mode-select')).toBeDisabled();
});

test('ChatPage exposes GLM thinking controls for OpenRouter GLM routes', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  await user.click(screen.getByTestId('chat-provider-select'));
  const openRouterOption = document.querySelector(
    '[role="option"][value="openrouter"]',
  ) as HTMLElement | null;
  expect(openRouterOption).not.toBeNull();
  await user.click(openRouterOption!);

  await user.click(screen.getByTestId('chat-model-select'));
  const glmOption = document.querySelector(
    '[role="option"][value="z-ai/glm-4.5"]',
  ) as HTMLElement | null;
  expect(glmOption).not.toBeNull();
  await user.click(glmOption!);

  expect(await screen.findByText('OpenRouter GLM thinking')).toBeInTheDocument();
  expect(screen.getByTestId('chat-thinking-mode-select')).toBeEnabled();

  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Use OpenRouter GLM thinking{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'openrouter',
      model: 'z-ai/glm-4.5',
      providerOptions: {
        openrouter: {
          reasoning: {
            enabled: true,
          },
        },
      },
    }),
    expect.any(Object),
  );
});

test('ChatPage exposes GLM thinking controls for Ollama GLM routes', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  await user.click(screen.getByTestId('chat-provider-select'));
  const ollamaOption = document.querySelector(
    '[role="option"][value="ollama"]',
  ) as HTMLElement | null;
  expect(ollamaOption).not.toBeNull();
  await user.click(ollamaOption!);

  await user.click(screen.getByTestId('chat-model-select'));
  const glmOption = document.querySelector(
    '[role="option"][value="glm-4.5"]',
  ) as HTMLElement | null;
  expect(glmOption).not.toBeNull();
  await user.click(glmOption!);

  expect(await screen.findByText('Ollama GLM thinking')).toBeInTheDocument();
  expect(screen.getByTestId('chat-thinking-mode-select')).toBeEnabled();

  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Use Ollama GLM thinking{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'ollama',
      model: 'glm-4.5',
      providerOptions: {
        ollama: {
          thinking: {
            enabled: true,
          },
        },
      },
    }),
    expect.any(Object),
  );
});

test('ChatPage lets the user switch provider and shows the catalog pricing note', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });

  await user.click(screen.getByTestId('chat-provider-select'));
  const openRouterOption = document.querySelector(
    '[role="option"][value="openrouter"]',
  ) as HTMLElement | null;
  expect(openRouterOption).not.toBeNull();
  await user.click(openRouterOption!);

  expect(
    await screen.findByText(
      /OpenRouter catalogs can include both free and paid models/i,
    ),
  ).toBeInTheDocument();
  await waitFor(() => expect(getModelsMock).toHaveBeenCalledWith('openrouter'));

  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Route this through OpenRouter{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'openrouter',
      model: 'openrouter/auto',
    }),
    expect.any(Object),
  );
}, 10_000);

test('ChatPage shows an xAI model access note when model loading fails', async () => {
  const user = userEvent.setup();

  getModelsMock.mockImplementation(async (providerId?: string) => {
    if (providerId === 'xai') {
      throw new Error(
        'xAI model listing failed with status 500: Internal server error',
      );
    }

    return {
      providerId: providerId ?? 'nanogpt',
      models: [{ id: 'nano-1', displayName: 'Nano 1' }],
    };
  });

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  await user.click(screen.getByTestId('chat-provider-select'));
  const xaiOption = document.querySelector(
    '[role="option"][value="xai"]',
  ) as HTMLElement | null;
  expect(xaiOption).not.toBeNull();
  await user.click(xaiOption!);

  expect(
    await screen.findByText(
      /xAI's models endpoint returns the models available to the authenticating API key/i,
    ),
  ).toBeInTheDocument();
  expect(await screen.findByText('Model loading failed')).toBeInTheDocument();
}, 10_000);

test('ChatPage shows the Anthropic catalog note with native and certified status', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  await user.click(screen.getByTestId('chat-provider-select'));
  const anthropicOption = document.querySelector(
    '[role="option"][value="anthropic"]',
  ) as HTMLElement | null;
  expect(anthropicOption).not.toBeNull();
  await user.click(anthropicOption!);

  expect(
    await screen.findByText(
      /Anthropic Claude support is native to the gateway and certified for the current chat contract/i,
    ),
  ).toBeInTheDocument();
}, 10_000);

test('ChatPage sends Anthropic extended thinking settings with the chat request', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  await user.click(screen.getByTestId('chat-provider-select'));
  const anthropicOption = document.querySelector(
    '[role="option"][value="anthropic"]',
  ) as HTMLElement | null;
  expect(anthropicOption).not.toBeNull();
  await user.click(anthropicOption!);

  await user.click(screen.getByTestId('chat-model-select'));
  const sonnetOption = document.querySelector(
    '[role="option"][value="claude-sonnet-4-20250514"]',
  ) as HTMLElement | null;
  expect(sonnetOption).not.toBeNull();
  await user.click(sonnetOption!);

  await user.click(screen.getByTestId('chat-anthropic-thinking-mode-select'));
  const budgetOption = document.querySelector(
    '[role="option"][value="budget"]',
  ) as HTMLElement | null;
  expect(budgetOption).not.toBeNull();
  await user.click(budgetOption!);

  const budgetInput = await screen.findByLabelText('Thinking budget tokens');
  await user.clear(budgetInput);
  await user.type(budgetInput, '8192');

  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Use Anthropic thinking{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      providerOptions: {
        anthropic: {
          extendedThinking: {
            mode: 'budget',
            budgetTokens: 8192,
          },
        },
      },
    }),
    expect.any(Object),
  );
}, 10_000);

test('ChatPage disables Anthropic thinking for Haiku models and forces none', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await screen.findByRole('heading', { name: 'Chat Lab' });
  await user.click(screen.getByTestId('chat-provider-select'));
  const anthropicOption = document.querySelector(
    '[role="option"][value="anthropic"]',
  ) as HTMLElement | null;
  expect(anthropicOption).not.toBeNull();
  await user.click(anthropicOption!);

  await user.click(screen.getByTestId('chat-model-select'));
  const haikuOption = document.querySelector(
    '[role="option"][value="claude-haiku-4-5-20251001"]',
  ) as HTMLElement | null;
  expect(haikuOption).not.toBeNull();
  await user.click(haikuOption!);

  expect(
    await screen.findByText(/extended thinking is unavailable for claude haiku models/i),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText('Thinking budget tokens')).not.toBeInTheDocument();
  expect(screen.getByTestId('chat-anthropic-thinking-mode-select')).toBeDisabled();

  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Use Anthropic haiku{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      providerOptions: {
        anthropic: {
          extendedThinking: {
            mode: 'disabled',
          },
        },
      },
    }),
    expect.any(Object),
  );
}, 10_000);

test('ChatPage sends max output tokens with the chat request when configured', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  const maxOutputTokensInput = await screen.findByLabelText('Max output tokens');
  await user.clear(maxOutputTokensInput);
  await user.type(maxOutputTokensInput, '2048');

  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Limit the output{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      providerId: 'nanogpt',
      model: 'z-ai/glm-4.6:thinking',
      maxOutputTokens: 2048,
    }),
    expect.any(Object),
  );
}, 10_000);

test('ChatPage keeps Shift+Enter for multiline drafting', async () => {
  renderWithProviders(<ChatPage />);

  const composer = await screen.findByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  fireEvent.change(composer, { target: { value: 'Line one' } });
  fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter', shiftKey: true });
  fireEvent.change(composer, { target: { value: 'Line one\nLine two' } });

  expect(chatStreamMock).not.toHaveBeenCalled();
  expect((composer as HTMLTextAreaElement).value).toBe('Line one\nLine two');
}, 10_000);

test('ChatPage deletes a conversation only after explicit confirmation', async () => {
  const user = userEvent.setup();

  loadConversationsMock.mockResolvedValue([
    {
      id: 'conversation-1',
      title: 'Delete me',
      model: 'z-ai/glm-4.6:thinking',
      providerId: 'nanogpt',
      systemPrompt: 'You are a helpful assistant.',
      updatedAt: '2026-04-16T00:00:00.000Z',
      messages: [],
    },
  ]);

  renderWithProviders(<ChatPage />);

  expect(
    await screen.findByRole('button', { name: 'Delete me' }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Delete Delete me' }));
  expect(
    await screen.findByRole('button', { name: 'Delete permanently' }),
  ).toBeInTheDocument();
  expect(deleteConversationMock).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Delete permanently' }));

  await waitFor(() =>
    expect(deleteConversationMock).toHaveBeenCalledWith('conversation-1'),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole('button', { name: 'Delete me' }),
    ).not.toBeInTheDocument(),
  );
});

test('ChatPage exports a selected conversation as JSON', async () => {
  const user = userEvent.setup();

  loadConversationsMock.mockResolvedValue([
    {
      id: 'conversation-1',
      title: 'Export me',
      model: 'z-ai/glm-4.6:thinking',
      providerId: 'nanogpt',
      systemPrompt: 'You are a helpful assistant.',
      updatedAt: '2026-04-16T00:00:00.000Z',
      messages: [],
    },
  ]);

  renderWithProviders(<ChatPage />);

  await user.click(
    await screen.findByRole('button', { name: 'Export Export me' }),
  );

  await waitFor(() => expect(exportConversationMock).toHaveBeenCalledTimes(1));
  expect(exportConversationMock).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'conversation-1',
      title: 'Export me',
    }),
  );
});

test('ChatPage copies an assistant response once streaming is complete', async () => {
  const user = userEvent.setup();
  const writeTextMock = vi.spyOn(navigator.clipboard, 'writeText');

  loadConversationsMock.mockResolvedValue([
    {
      id: 'conversation-1',
      title: 'Copy me',
      model: 'z-ai/glm-4.6:thinking',
      providerId: 'nanogpt',
      systemPrompt: 'You are a helpful assistant.',
      updatedAt: '2026-04-16T00:00:00.000Z',
      messages: [
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Assistant answer',
          reasoning: '',
          createdAt: '2026-04-16T00:00:00.000Z',
        },
      ],
    },
  ]);

  renderWithProviders(<ChatPage />);

  await user.click(await screen.findByRole('button', { name: 'Copy' }));

  await waitFor(() =>
    expect(writeTextMock).toHaveBeenCalledWith('Assistant answer'),
  );
  expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
});

test('ChatPage loads older and newer message windows while scrolling', async () => {
  const longConversationMessages = Array.from({ length: 100 }, (_, index) => ({
    id: `message-${index + 1}`,
    role: (index + 1) % 2 === 0 ? ('assistant' as const) : ('user' as const),
    content: `Message ${index + 1}`,
    reasoning: '',
    createdAt: `2026-04-16T00:${String(index).padStart(2, '0')}:00.000Z`,
  }));

  loadConversationsMock.mockResolvedValue([
    {
      id: 'conversation-1',
      title: 'Long thread',
      model: 'z-ai/glm-4.6:thinking',
      providerId: 'nanogpt',
      systemPrompt: 'You are a helpful assistant.',
      updatedAt: '2026-04-16T00:00:00.000Z',
      messages: longConversationMessages,
    },
  ]);

  const { container } = renderWithProviders(<ChatPage />);
  const scrollContainer = container.querySelector(
    '.chat-scroll',
  ) as HTMLDivElement | null;

  expect(scrollContainer).not.toBeNull();
  expect(await screen.findByText('Message 100')).toBeInTheDocument();
  expect(screen.queryByText('Message 89')).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Load 10 earlier messages' }),
  ).toBeInTheDocument();

  Object.defineProperty(scrollContainer!, 'scrollTop', {
    configurable: true,
    writable: true,
    value: 0,
  });
  Object.defineProperty(scrollContainer!, 'clientHeight', {
    configurable: true,
    writable: true,
    value: 400,
  });
  Object.defineProperty(scrollContainer!, 'scrollHeight', {
    configurable: true,
    writable: true,
    value: 1200,
  });

  fireEvent.scroll(scrollContainer!);
  fireEvent.scroll(scrollContainer!);
  fireEvent.scroll(scrollContainer!);
  fireEvent.scroll(scrollContainer!);

  await waitFor(() =>
    expect(screen.getByText('Message 51')).toBeInTheDocument(),
  );
  expect(
    screen.getByRole('button', { name: 'Load 10 newer messages' }),
  ).toBeInTheDocument();

  Object.defineProperty(scrollContainer!, 'scrollTop', {
    configurable: true,
    writable: true,
    value: 800,
  });
  Object.defineProperty(scrollContainer!, 'scrollHeight', {
    configurable: true,
    writable: true,
    value: 1200,
  });

  fireEvent.scroll(scrollContainer!);

  await waitFor(() =>
    expect(screen.getByText('Message 91')).toBeInTheDocument(),
  );
});

test('ChatPage retries an assistant response from the previous user message context', async () => {
  const user = userEvent.setup();

  loadConversationsMock.mockResolvedValue([
    {
      id: 'conversation-1',
      title: 'Retry me',
      model: 'z-ai/glm-4.6:thinking',
      providerId: 'nanogpt',
      systemPrompt: 'You are a helpful assistant.',
      updatedAt: '2026-04-16T00:00:00.000Z',
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: 'First prompt',
          createdAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'First answer',
          reasoning: '',
          createdAt: '2026-04-16T00:01:00.000Z',
        },
      ],
    },
  ]);

  renderWithProviders(<ChatPage />);

  await user.click(await screen.findByLabelText('Retry response'));

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'First prompt' },
      ],
    }),
    expect.any(Object),
  );
}, 10_000);

test('ChatPage edits a user message and resends from the edited content', async () => {
  const user = userEvent.setup();

  loadConversationsMock.mockResolvedValue([
    {
      id: 'conversation-1',
      title: 'Edit me',
      model: 'z-ai/glm-4.6:thinking',
      providerId: 'nanogpt',
      systemPrompt: 'You are a helpful assistant.',
      updatedAt: '2026-04-16T00:00:00.000Z',
      messages: [
        {
          id: 'user-1',
          role: 'user',
          content: 'Old prompt',
          createdAt: '2026-04-16T00:00:00.000Z',
        },
        {
          id: 'assistant-1',
          role: 'assistant',
          content: 'Old answer',
          reasoning: '',
          createdAt: '2026-04-16T00:01:00.000Z',
        },
      ],
    },
  ]);

  renderWithProviders(<ChatPage />);

  await user.click(await screen.findByLabelText('Edit message'));
  const editor = screen.getByDisplayValue('Old prompt');
  await user.clear(editor);
  await user.type(editor, 'Updated prompt');
  await user.click(screen.getByRole('button', { name: 'Resend' }));

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Updated prompt' },
      ],
    }),
    expect.any(Object),
  );
});

test('ChatPage saves a custom system prompt and uses it for the next send', async () => {
  const user = userEvent.setup();

  loadConversationsMock.mockResolvedValue([
    {
      id: 'conversation-1',
      title: 'Prompted',
      model: 'z-ai/glm-4.6:thinking',
      providerId: 'nanogpt',
      systemPrompt: 'You are a helpful assistant.',
      updatedAt: '2026-04-16T00:00:00.000Z',
      messages: [],
    },
  ]);

  renderWithProviders(<ChatPage />);

  await user.click(await screen.findByRole('tab', { name: 'System prompt' }));
  const promptEditor = screen.getByLabelText('System prompt');
  await user.clear(promptEditor);
  await user.type(promptEditor, 'You are a concise assistant.');
  await user.click(screen.getByRole('button', { name: 'Save prompt' }));

  await waitFor(() =>
    expect(saveConversationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: 'You are a concise assistant.',
      }),
    ),
  );

  await user.click(screen.getByRole('tab', { name: 'System prompt *' }));
  await user.click(screen.getByRole('tab', { name: 'Conversation' }));
  const composer = screen.getByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Use custom prompt{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));
  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        { role: 'system', content: 'You are a concise assistant.' },
        { role: 'user', content: 'Use custom prompt' },
      ],
    }),
    expect.any(Object),
  );
});

test('ChatPage imports conversations and surfaces transfer failures', async () => {
  const user = userEvent.setup();
  const importedConversation = {
    id: 'conversation-imported',
    title: 'Imported thread',
    model: 'z-ai/glm-4.6:thinking',
    providerId: 'nanogpt',
    systemPrompt: 'You are a helpful assistant.',
    updatedAt: '2026-04-17T00:00:00.000Z',
    messages: [],
  };

  importConversationFileMock.mockResolvedValueOnce({
    conversations: [importedConversation],
  });
  exportConversationArchiveMock.mockRejectedValueOnce(
    new Error('Archive export failed.'),
  );

  renderWithProviders(<ChatPage />);

  await screen.findByPlaceholderText(
    'Ask the provider something meaningful...',
  );

  const fileInput = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement | null;
  expect(fileInput).not.toBeNull();

  const file = new File(
    [JSON.stringify(importedConversation)],
    'conversation.json',
    {
      type: 'application/json',
    },
  );
  fireEvent.change(fileInput!, { target: { files: [file] } });

  expect(
    await screen.findByRole('button', { name: 'Imported thread' }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(saveConversationMock).toHaveBeenCalledWith({
      ...importedConversation,
      ownerUserUuid: 'user-1',
      tenantId: 'tenant-1',
    }),
  );

  await user.click(screen.getByLabelText('Export all conversations'));
  expect(await screen.findByText('Archive export failed.')).toBeInTheDocument();
});

test('ChatPage surfaces missing assistant content and interrupted reasoning streams', async () => {
  const user = userEvent.setup();

  chatStreamMock.mockImplementationOnce(async () => ({
    requestId: 'request-empty',
    receivedReasoning: false,
    receivedContent: false,
    finishReason: 'stop',
  }));

  renderWithProviders(<ChatPage />);

  const composer = await screen.findByPlaceholderText(
    'Ask the provider something meaningful...',
  );
  await user.type(composer, 'Empty reply{enter}');

  expect(
    await screen.findByText(
      'The model stream ended before any assistant output was received.',
    ),
  ).toBeInTheDocument();

  chatStreamMock.mockImplementationOnce(async (_payload, handlers) => {
    handlers.onChunk({ reasoningDelta: 'Thinking...', contentDelta: '' });
    throw new Error('Stream interrupted.');
  });

  await user.type(
    screen.getByPlaceholderText('Ask the provider something meaningful...'),
    'Partial{enter}',
  );

  expect(await screen.findByText('Stream interrupted.')).toBeInTheDocument();
  expect(
    await screen.findByText(
      'Assistant response was interrupted before content generation completed.',
    ),
  ).toBeInTheDocument();
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ChatPage } from './chat-page';

const {
  getSessionMock,
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
    roles: ['admin'],
  })),
  chatStreamMock: vi.fn(async (_payload, _handlers) => ({
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
    exportConversation: exportConversationMock,
    exportConversationArchive: exportConversationArchiveMock,
    getRuntimeConfig: vi.fn(async () => ({
      registrationEnabled: true,
      forgotPasswordEnabled: true,
      gatewayOnline: true,
      supportedProviders: [{ providerId: 'nanogpt', displayName: 'NanoGPT' }],
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
  chatStreamMock.mockClear();
  deleteConversationMock.mockClear();
  exportConversationArchiveMock.mockClear();
  exportConversationMock.mockClear();
  getModelsMock.mockClear();
  importConversationFileMock.mockClear();
  loadConversationsMock.mockReset();
  loadConversationsMock.mockResolvedValue([]);
  saveConversationMock.mockClear();
});

test('ChatPage submits on Enter from the composer', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  const composer = await screen.findByPlaceholderText('Ask the provider something meaningful...');
  await user.type(composer, 'Test prompt{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));

  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
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
});

test('ChatPage keeps Shift+Enter for multiline drafting', async () => {
  renderWithProviders(<ChatPage />);

  const composer = await screen.findByPlaceholderText('Ask the provider something meaningful...');
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

  expect(await screen.findByRole('button', { name: 'Delete me' })).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Delete Delete me' }));
  expect(await screen.findByRole('button', { name: 'Delete permanently' })).toBeInTheDocument();
  expect(deleteConversationMock).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Delete permanently' }));

  await waitFor(() => expect(deleteConversationMock).toHaveBeenCalledWith('conversation-1'));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Delete me' })).not.toBeInTheDocument(),
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

  await user.click(await screen.findByRole('button', { name: 'Export Export me' }));

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

  await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith('Assistant answer'));
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
  const scrollContainer = container.querySelector('.chat-scroll') as HTMLDivElement | null;

  expect(scrollContainer).not.toBeNull();
  expect(await screen.findByText('Message 100')).toBeInTheDocument();
  expect(screen.queryByText('Message 89')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Load 10 earlier messages' })).toBeInTheDocument();

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

  await waitFor(() => expect(screen.getByText('Message 51')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Load 10 newer messages' })).toBeInTheDocument();

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

  await waitFor(() => expect(screen.getByText('Message 91')).toBeInTheDocument());
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
  const composer = screen.getByPlaceholderText('Ask the provider something meaningful...');
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
  exportConversationArchiveMock.mockRejectedValueOnce(new Error('Archive export failed.'));

  renderWithProviders(<ChatPage />);

  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
  expect(fileInput).not.toBeNull();

  const file = new File([JSON.stringify(importedConversation)], 'conversation.json', {
    type: 'application/json',
  });
  fireEvent.change(fileInput!, { target: { files: [file] } });

  expect(await screen.findByRole('button', { name: 'Imported thread' })).toBeInTheDocument();
  await waitFor(() => expect(saveConversationMock).toHaveBeenCalledWith(importedConversation));

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

  const composer = await screen.findByPlaceholderText('Ask the provider something meaningful...');
  await user.type(composer, 'Empty reply{enter}');

  expect(
    await screen.findByText('The model stream ended before any assistant output was received.'),
  ).toBeInTheDocument();

  chatStreamMock.mockImplementationOnce(async (_payload, handlers) => {
    handlers.onChunk({ reasoningDelta: 'Thinking...', contentDelta: '' });
    throw new Error('Stream interrupted.');
  });

  await user.type(screen.getByPlaceholderText('Ask the provider something meaningful...'), 'Partial{enter}');

  expect(await screen.findByText('Stream interrupted.')).toBeInTheDocument();
  expect(
    await screen.findByText('Assistant response was interrupted before content generation completed.'),
  ).toBeInTheDocument();
});

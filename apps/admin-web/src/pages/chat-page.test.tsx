import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ChatPage } from './chat-page';

const {
  chatStreamMock,
  deleteConversationMock,
  exportConversationArchiveMock,
  exportConversationMock,
  getModelsMock,
  importConversationFileMock,
  loadConversationsMock,
  saveConversationMock,
} = vi.hoisted(() => ({
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
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  const composer = await screen.findByPlaceholderText('Ask the provider something meaningful...');
  await user.type(composer, 'Line one');
  await user.keyboard('{Shift>}{Enter}{/Shift}');
  await user.type(composer, 'Line two');

  expect(chatStreamMock).not.toHaveBeenCalled();
  expect((composer as HTMLTextAreaElement).value).toBe('Line one\nLine two');
});

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

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ChatPage } from './chat-page';

const { chatStreamMock, deleteConversationMock, getModelsMock, loadConversationsMock, saveConversationMock } = vi.hoisted(() => ({
  chatStreamMock: vi.fn(async (_payload, _handlers) => ({
    requestId: 'request-1',
    receivedReasoning: false,
    receivedContent: false,
    finishReason: 'stop',
  })),
  deleteConversationMock: vi.fn(async () => undefined),
  getModelsMock: vi.fn(async () => ({
    providerId: 'nanogpt',
    models: [{ id: 'z-ai/glm-4.6:thinking', displayName: 'GLM 4.6 Thinking' }],
  })),
  loadConversationsMock: vi.fn(async () => []),
  saveConversationMock: vi.fn(async () => undefined),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    getRuntimeConfig: vi.fn(async () => ({
      registrationEnabled: true,
      forgotPasswordEnabled: true,
      gatewayOnline: true,
      supportedProviders: [{ providerId: 'nanogpt', displayName: 'NanoGPT' }],
    })),
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
  getModelsMock.mockClear();
  loadConversationsMock.mockReset();
  loadConversationsMock.mockResolvedValue([]);
  saveConversationMock.mockClear();
});

test('ChatPage submits on Enter and includes the active system prompt', async () => {
  const user = userEvent.setup();

  renderWithProviders(<ChatPage />);

  await user.click(await screen.findByRole('tab', { name: 'System prompt' }));
  const systemPromptField = await screen.findByLabelText('System prompt', {
    selector: 'textarea',
  });
  await user.clear(systemPromptField);
  await user.type(systemPromptField, 'I am a helpful assistant.');

  await user.click(screen.getByRole('tab', { name: 'Conversation' }));

  const composer = screen.getByPlaceholderText('Ask the provider something meaningful...');
  await user.type(composer, 'Test prompt{enter}');

  await waitFor(() => expect(chatStreamMock).toHaveBeenCalledTimes(1));

  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      stream: true,
      messages: [
        {
          role: 'system',
          content: 'I am a helpful assistant.',
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
  await user.type(composer, 'Line one{shift>}{enter}{/shift}Line two');

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
  expect(screen.getByText('Delete conversation?')).toBeInTheDocument();
  expect(deleteConversationMock).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Delete permanently' }));

  await waitFor(() => expect(deleteConversationMock).toHaveBeenCalledWith('conversation-1'));
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Delete me' })).not.toBeInTheDocument(),
  );
});

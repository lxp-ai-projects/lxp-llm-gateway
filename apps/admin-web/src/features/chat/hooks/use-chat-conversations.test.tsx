import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import type { StoredConversation } from '../../../lib/chat-store';
import { DEFAULT_SYSTEM_PROMPT } from '../../../lib/chat-thread';
import { useChatConversations } from './use-chat-conversations';

const {
  createClientIdMock,
  deleteConversationMock,
  loadConversationsMock,
  saveConversationMock,
} = vi.hoisted(() => ({
  createClientIdMock: vi.fn(() => 'generated-conversation-id'),
  deleteConversationMock: vi.fn(async () => undefined),
  loadConversationsMock: vi.fn(async () => []),
  saveConversationMock: vi.fn(async () => undefined),
}));

vi.mock('../../../lib/id', () => ({
  createClientId: createClientIdMock,
}));

vi.mock('../../../lib/chat-store', async () => {
  const actual = await vi.importActual<
    typeof import('../../../lib/chat-store')
  >('../../../lib/chat-store');

  return {
    ...actual,
    deleteConversation: deleteConversationMock,
    loadConversations: loadConversationsMock,
    saveConversation: saveConversationMock,
  };
});

function createConversation(
  overrides: Partial<StoredConversation> = {},
): StoredConversation {
  return {
    id: 'conversation-1',
    title: 'Existing conversation',
    model: 'z-ai/glm-4.6:thinking',
    providerId: 'nanogpt',
    systemPrompt: 'Existing prompt',
    updatedAt: '2026-04-17T00:00:00.000Z',
    messages: [],
    ...overrides,
  };
}

beforeEach(() => {
  createClientIdMock.mockClear();
  deleteConversationMock.mockClear();
  loadConversationsMock.mockClear();
  saveConversationMock.mockClear();
});

test('useChatConversations loads stored conversations and syncs the active system prompt', async () => {
  loadConversationsMock.mockResolvedValue([
    createConversation(),
    createConversation({
      id: 'conversation-2',
      title: 'Older conversation',
      systemPrompt: 'Older prompt',
      updatedAt: '2026-04-16T00:00:00.000Z',
    }),
  ]);

  const onResetComposerState = vi.fn();
  const onSetChatError = vi.fn();
  const onSetActivePanel = vi.fn();

  const { result } = renderHook(() =>
    useChatConversations({
      model: 'z-ai/glm-4.6:thinking',
      onResetComposerState,
      onSetChatError,
      onSetActivePanel,
    }),
  );

  await waitFor(() => expect(result.current.conversations).toHaveLength(2));
  expect(result.current.activeConversationId).toBe('conversation-1');
  expect(result.current.systemPrompt).toBe('Existing prompt');
});

test('useChatConversations creates and persists a new conversation with the current prompt', async () => {
  loadConversationsMock.mockResolvedValue([]);

  const { result } = renderHook(() =>
    useChatConversations({
      model: 'z-ai/glm-4.6:thinking',
      onResetComposerState: vi.fn(),
      onSetChatError: vi.fn(),
      onSetActivePanel: vi.fn(),
    }),
  );

  await waitFor(() => expect(result.current.conversations).toEqual([]));

  act(() => {
    result.current.setSystemPrompt('Custom system prompt');
  });

  await act(async () => {
    await result.current.createConversation();
  });

  expect(saveConversationMock).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'generated-conversation-id',
      model: 'z-ai/glm-4.6:thinking',
      providerId: 'nanogpt',
      systemPrompt: 'Custom system prompt',
      title: 'New conversation',
    }),
  );
  expect(result.current.activeConversationId).toBe('generated-conversation-id');
  expect(result.current.conversations[0]?.systemPrompt).toBe(
    'Custom system prompt',
  );
});

test('useChatConversations persists model and system prompt changes for the active conversation', async () => {
  loadConversationsMock.mockResolvedValue([createConversation()]);

  const { result } = renderHook(() =>
    useChatConversations({
      model: 'z-ai/glm-4.6:thinking',
      onResetComposerState: vi.fn(),
      onSetChatError: vi.fn(),
      onSetActivePanel: vi.fn(),
    }),
  );

  await waitFor(() =>
    expect(result.current.activeConversation?.id).toBe('conversation-1'),
  );

  await act(async () => {
    await result.current.persistConversationModel('mistral-medium');
  });

  await waitFor(() =>
    expect(result.current.activeConversation?.model).toBe('mistral-medium'),
  );

  await act(async () => {
    await result.current.persistConversationSystemPrompt('Updated prompt');
  });

  expect(saveConversationMock).toHaveBeenCalledTimes(2);
  expect(result.current.activeConversation?.model).toBe('mistral-medium');
  expect(result.current.activeConversation?.systemPrompt).toBe(
    'Updated prompt',
  );
  expect(result.current.systemPrompt).toBe('Updated prompt');
});

test('useChatConversations deletes the active conversation and resets dependent chat state', async () => {
  loadConversationsMock.mockResolvedValue([
    createConversation({
      id: 'conversation-1',
      title: 'Newest conversation',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }),
    createConversation({
      id: 'conversation-2',
      title: 'Fallback conversation',
      updatedAt: '2026-04-16T00:00:00.000Z',
      systemPrompt: 'Fallback prompt',
    }),
  ]);

  const onResetComposerState = vi.fn();
  const onSetChatError = vi.fn();
  const onSetActivePanel = vi.fn();

  const { result } = renderHook(() =>
    useChatConversations({
      model: 'z-ai/glm-4.6:thinking',
      onResetComposerState,
      onSetChatError,
      onSetActivePanel,
    }),
  );

  await waitFor(() =>
    expect(result.current.activeConversationId).toBe('conversation-1'),
  );

  act(() => {
    result.current.setConversationPendingDeletion(
      result.current.activeConversation,
    );
  });

  await act(async () => {
    await result.current.confirmConversationDeletion();
  });

  expect(deleteConversationMock).toHaveBeenCalledWith('conversation-1');
  expect(result.current.activeConversationId).toBe('conversation-2');
  expect(result.current.systemPrompt).toBe('Fallback prompt');
  expect(result.current.conversationPendingDeletion).toBeNull();
  expect(onSetActivePanel).toHaveBeenCalledWith('conversation');
  expect(onSetChatError).toHaveBeenCalledWith(null);
  expect(onResetComposerState).toHaveBeenCalled();
});

test('useChatConversations falls back cleanly when local loading fails', async () => {
  loadConversationsMock.mockRejectedValue(new Error('IndexedDB offline'));

  const { result } = renderHook(() =>
    useChatConversations({
      model: 'z-ai/glm-4.6:thinking',
      onResetComposerState: vi.fn(),
      onSetChatError: vi.fn(),
      onSetActivePanel: vi.fn(),
    }),
  );

  await waitFor(() => expect(result.current.conversations).toEqual([]));
  expect(result.current.activeConversation).toBeNull();
  expect(result.current.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
});

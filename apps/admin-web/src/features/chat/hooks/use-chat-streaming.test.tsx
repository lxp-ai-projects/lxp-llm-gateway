import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import type { StoredConversation } from '../../../lib/chat-store';
import { useChatStreaming } from './use-chat-streaming';

const { chatStreamMock, saveConversationMock } = vi.hoisted(() => ({
  chatStreamMock: vi.fn(),
  saveConversationMock: vi.fn(async () => undefined),
}));

vi.mock('../../../lib/api-client', () => ({
  gatewayApiClient: {
    chatStream: chatStreamMock,
  },
}));

vi.mock('../../../lib/chat-store', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/chat-store')>(
    '../../../lib/chat-store',
  );

  return {
    ...actual,
    saveConversation: saveConversationMock,
  };
});

function createConversation(): StoredConversation {
  return {
    id: 'conversation-1',
    title: 'Test conversation',
    model: 'z-ai/glm-4.6:thinking',
    providerId: 'nanogpt',
    systemPrompt: 'You are a helpful assistant.',
    updatedAt: '2026-04-17T00:00:00.000Z',
    messages: [
      {
        id: 'user-1',
        role: 'user',
        content: 'Hello',
        createdAt: '2026-04-17T00:00:00.000Z',
      },
    ],
  };
}

function setup(activeConversation: StoredConversation | null = createConversation()) {
  const onClearEditingState = vi.fn();
  const onConversationActivated = vi.fn();
  const onPromptCleared = vi.fn();
  const onSetAutoScrollEnabled = vi.fn();
  const onSetChatError = vi.fn();
  const onStreamingChange = vi.fn();
  let currentConversations = activeConversation ? [activeConversation] : [];

  const onConversationUpdated = vi.fn((updater) => {
    currentConversations =
      typeof updater === 'function' ? updater(currentConversations) : updater;
  });

  const hook = renderHook(() =>
    useChatStreaming({
      activeConversation,
      editingContent: 'Updated content',
      model: 'z-ai/glm-4.6:thinking',
      onClearEditingState,
      onConversationActivated,
      onConversationUpdated,
      onPromptCleared,
      onSetAutoScrollEnabled,
      onSetChatError,
      onStreamingChange,
    }),
  );

  return {
    currentConversations: () => currentConversations,
    hook,
    onClearEditingState,
    onConversationActivated,
    onConversationUpdated,
    onPromptCleared,
    onSetAutoScrollEnabled,
    onSetChatError,
    onStreamingChange,
  };
}

beforeEach(() => {
  chatStreamMock.mockReset();
  saveConversationMock.mockClear();
});

test('useChatStreaming sends a prompt and persists the completed assistant response', async () => {
  chatStreamMock.mockImplementation(async (_payload, handlers) => {
    handlers.onChunk?.({ reasoningDelta: 'Thinking...', contentDelta: '' });
    handlers.onChunk?.({ reasoningDelta: '', contentDelta: 'Hello back' });

    return {
      requestId: 'request-1',
      receivedReasoning: true,
      receivedContent: true,
      finishReason: 'stop',
    };
  });

  const {
    hook,
    onClearEditingState,
    onConversationActivated,
    onPromptCleared,
    onSetAutoScrollEnabled,
    onSetChatError,
    onStreamingChange,
    currentConversations,
  } = setup();

  await act(async () => {
    await hook.result.current.sendMessage(createConversation, 'Hello');
  });

  expect(chatStreamMock).toHaveBeenCalledTimes(1);
  expect(onPromptCleared).toHaveBeenCalled();
  expect(onClearEditingState).toHaveBeenCalled();
  expect(onSetAutoScrollEnabled).toHaveBeenCalledWith(true);
  expect(onConversationActivated).toHaveBeenCalled();
  expect(onSetChatError).toHaveBeenCalledWith(null);
  expect(onStreamingChange).toHaveBeenNthCalledWith(1, true);
  expect(onStreamingChange).toHaveBeenLastCalledWith(false);
  expect(saveConversationMock).toHaveBeenCalledTimes(1);
  expect(currentConversations()[0]?.messages.at(-1)).toMatchObject({
    role: 'assistant',
    content: 'Hello back',
    reasoning: 'Thinking...',
  });
});

test('useChatStreaming surfaces missing assistant content when the stream ends empty', async () => {
  chatStreamMock.mockResolvedValue({
    requestId: 'request-1',
    receivedReasoning: false,
    receivedContent: false,
    finishReason: 'stop',
  });

  const { hook, onSetChatError } = setup();

  await act(async () => {
    await hook.result.current.sendMessage(createConversation, 'Hello');
  });

  expect(onSetChatError).toHaveBeenLastCalledWith(
    'The model stream ended before any assistant output was received.',
  );
});

test('useChatStreaming retries an assistant message from the prior user context', async () => {
  const activeConversation: StoredConversation = {
    ...createConversation(),
    messages: [
      {
        id: 'user-1',
        role: 'user',
        content: 'Question',
        createdAt: '2026-04-17T00:00:00.000Z',
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Answer',
        reasoning: '',
        createdAt: '2026-04-17T00:01:00.000Z',
      },
    ],
  };

  chatStreamMock.mockResolvedValue({
    requestId: 'request-2',
    receivedReasoning: false,
    receivedContent: true,
    finishReason: 'stop',
  });

  const { hook } = setup(activeConversation);

  await act(async () => {
    await hook.result.current.retryAssistantMessage((conversation) => conversation, 'assistant-1');
  });

  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Question' },
      ],
    }),
    expect.any(Object),
  );
});

test('useChatStreaming resends an edited user message', async () => {
  const activeConversation: StoredConversation = {
    ...createConversation(),
    messages: [
      {
        id: 'user-1',
        role: 'user',
        content: 'Original question',
        createdAt: '2026-04-17T00:00:00.000Z',
      },
      {
        id: 'assistant-1',
        role: 'assistant',
        content: 'Original answer',
        reasoning: '',
        createdAt: '2026-04-17T00:01:00.000Z',
      },
    ],
  };

  chatStreamMock.mockResolvedValue({
    requestId: 'request-3',
    receivedReasoning: false,
    receivedContent: true,
    finishReason: 'stop',
  });

  const { hook } = setup(activeConversation);

  await act(async () => {
    await hook.result.current.resendEditedMessage((conversation) => conversation, 'user-1');
  });

  expect(chatStreamMock).toHaveBeenCalledWith(
    expect.objectContaining({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Updated content' },
      ],
    }),
    expect.any(Object),
  );
});

test('useChatStreaming flags missing assistant content when only reasoning was received', async () => {
  chatStreamMock.mockImplementation(async (_payload, handlers) => {
    handlers.onChunk?.({ reasoningDelta: 'Thinking only', contentDelta: '' });

    return {
      requestId: 'request-4',
      receivedReasoning: true,
      receivedContent: false,
      finishReason: 'stop',
    };
  });

  const { hook, onSetChatError, currentConversations } = setup();

  await act(async () => {
    await hook.result.current.sendMessage(createConversation, 'Hello');
  });

  expect(onSetChatError).toHaveBeenLastCalledWith(null);
  expect(currentConversations()[0]?.messages.at(-1)).toMatchObject({
    role: 'assistant',
    content: '',
    reasoning: 'Thinking only',
  });
});

test('useChatStreaming preserves partial assistant output when the stream fails after chunks', async () => {
  chatStreamMock.mockImplementation(async (_payload, handlers) => {
    handlers.onChunk?.({ reasoningDelta: 'Partial reasoning', contentDelta: 'Partial answer' });
    throw new Error('socket reset');
  });

  const { hook, onSetChatError, currentConversations } = setup();

  await act(async () => {
    await hook.result.current.sendMessage(createConversation, 'Hello');
  });

  expect(onSetChatError).toHaveBeenLastCalledWith('socket reset');
  expect(saveConversationMock).toHaveBeenCalled();
  expect(currentConversations()[0]?.messages.at(-1)).toMatchObject({
    role: 'assistant',
    content: 'Partial answer',
    reasoning: 'Partial reasoning',
  });
});

test('useChatStreaming removes the draft assistant message when the stream fails before any output', async () => {
  chatStreamMock.mockRejectedValue('fatal stream failure');

  const { hook, onSetChatError, currentConversations } = setup();

  await act(async () => {
    await hook.result.current.sendMessage(createConversation, 'Hello');
  });

  expect(onSetChatError).toHaveBeenLastCalledWith(
    'The gateway stream failed unexpectedly.',
  );
  expect(currentConversations()[0]?.messages).toHaveLength(2);
  expect(currentConversations()[0]?.messages.every((message) => message.role === 'user')).toBe(
    true,
  );
  expect(currentConversations()[0]?.messages.at(-1)?.content).toBe('Hello');
});

test('useChatStreaming no-ops retry and resend when there is no active conversation', async () => {
  const { hook } = setup(null);

  await act(async () => {
    await hook.result.current.retryAssistantMessage((conversation) => conversation, 'assistant-1');
    await hook.result.current.resendEditedMessage((conversation) => conversation, 'user-1');
  });

  expect(chatStreamMock).not.toHaveBeenCalled();
});

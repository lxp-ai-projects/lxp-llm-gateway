import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type { StoredConversation } from '../../../lib/chat-store';
import { CHAT_WINDOW_PAGE_SIZE } from '../../../lib/chat-window';
import { useChatMessageWindow } from './use-chat-message-window';

function createConversation(messageCount: number): StoredConversation {
  return {
    id: 'conversation-1',
    title: 'Window test',
    model: 'z-ai/glm-4.6:thinking',
    providerId: 'nanogpt',
    systemPrompt: 'You are a helpful assistant.',
    updatedAt: '2026-04-17T00:00:00.000Z',
    messages: Array.from({ length: messageCount }, (_, index) => ({
      id: `message-${index + 1}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${index + 1}`,
      createdAt: `2026-04-17T00:${String(index).padStart(2, '0')}:00.000Z`,
    })),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('useChatMessageWindow starts from the latest page and loads older/newer slices', () => {
  const conversation = createConversation(45);

  const { result } = renderHook(() =>
    useChatMessageWindow({
      activeConversation: conversation,
      isStreaming: false,
    }),
  );

  expect(result.current.renderedMessages).toHaveLength(CHAT_WINDOW_PAGE_SIZE);
  expect(result.current.renderedMessages[0]?.id).toBe('message-36');
  expect(result.current.hiddenMessageCountAbove).toBe(35);
  expect(result.current.hiddenMessageCountBelow).toBe(0);

  act(() => {
    result.current.loadEarlierMessages();
  });

  expect(result.current.renderedMessages[0]?.id).toBe('message-26');
  expect(result.current.hiddenMessageCountAbove).toBe(25);
  expect(result.current.hiddenMessageCountBelow).toBe(0);

  act(() => {
    result.current.loadNewerMessages();
  });

  expect(result.current.renderedMessages[0]?.id).toBe('message-26');
  expect(result.current.hiddenMessageCountAbove).toBe(25);
});

test('useChatMessageWindow reacts to scroll thresholds and toggles auto follow near the tail', () => {
  const conversation = createConversation(45);

  const { result } = renderHook(() =>
    useChatMessageWindow({
      activeConversation: conversation,
      isStreaming: false,
    }),
  );

  act(() => {
    result.current.handleScroll({
      currentTarget: {
        scrollTop: 40,
        clientHeight: 500,
        scrollHeight: 3000,
      },
    } as never);
  });

  expect(result.current.hiddenMessageCountAbove).toBe(25);

  act(() => {
    result.current.handleScroll({
      currentTarget: {
        scrollTop: 2410,
        clientHeight: 500,
        scrollHeight: 3000,
      },
    } as never);
  });

  expect(result.current.hiddenMessageCountAbove).toBe(25);
});

test('useChatMessageWindow follows the tail while streaming when new messages arrive', () => {
  const firstConversation = createConversation(12);
  const { result, rerender } = renderHook(
    ({ activeConversation, isStreaming }: { activeConversation: StoredConversation; isStreaming: boolean }) =>
      useChatMessageWindow({
        activeConversation,
        isStreaming,
      }),
    {
      initialProps: {
        activeConversation: firstConversation,
        isStreaming: false,
      },
    },
  );

  act(() => {
    result.current.setAutoScrollEnabled(false);
  });

  const secondConversation = createConversation(13);
  rerender({
    activeConversation: secondConversation,
    isStreaming: true,
  });

  expect(result.current.renderedMessages).toHaveLength(CHAT_WINDOW_PAGE_SIZE);
  expect(result.current.renderedMessages[0]?.id).toBe('message-4');
  expect(result.current.renderedMessages.at(-1)?.id).toBe('message-13');
});

test('useChatMessageWindow can attach to a scroll container and schedule bottom scrolling', () => {
  const conversation = createConversation(12);
  const { result, rerender } = renderHook(
    ({ activeConversation, isStreaming }: { activeConversation: StoredConversation; isStreaming: boolean }) =>
      useChatMessageWindow({
        activeConversation,
        isStreaming,
      }),
    {
      initialProps: {
        activeConversation: conversation,
        isStreaming: false,
      },
    },
  );

  const container = document.createElement('div');
  Object.defineProperty(container, 'scrollTop', {
    value: 100,
    writable: true,
  });
  Object.defineProperty(container, 'scrollHeight', {
    value: 1000,
    writable: true,
  });
  Object.defineProperty(container, 'clientHeight', {
    value: 400,
    writable: true,
  });

  act(() => {
    result.current.chatScrollRef.current = container;
  });

  rerender({
    activeConversation: createConversation(13),
    isStreaming: true,
  });

  act(() => {
    vi.runAllTimers();
  });

  expect(container.scrollTop).toBe(600);
});

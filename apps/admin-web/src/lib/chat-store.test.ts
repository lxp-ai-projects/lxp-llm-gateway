import { beforeEach, expect, test, vi } from 'vitest';

import { deleteConversation, loadConversations, saveConversation } from './chat-store';

type FakeRequest<T> = {
  result: T;
  error: Error | null;
  onsuccess: null | (() => void);
  onerror: null | (() => void);
  onupgradeneeded?: null | (() => void);
};

type StoredConversationRecord = {
  id: string;
  title: string;
  model: string;
  providerId: string;
  systemPrompt?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
    createdAt: string;
  }>;
  updatedAt: string;
};

const sampleConversation: StoredConversationRecord = {
  id: 'conversation-1',
  title: 'First exchange',
  model: 'z-ai/glm-4.6:thinking',
  providerId: 'nanogpt',
  systemPrompt: 'I am a helpful assistant.',
  messages: [
    {
      id: 'message-1',
      role: 'user',
      content: 'Hello',
      createdAt: '2026-04-17T00:00:00.000Z',
    },
  ],
  updatedAt: '2026-04-17T00:00:00.000Z',
};

function flush<T>(request: FakeRequest<T>, callbackName: 'onsuccess' | 'onupgradeneeded') {
  queueMicrotask(() => {
    request[callbackName]?.();
  });
}

beforeEach(() => {
  const store = new Map<string, StoredConversationRecord>();

  const indexedDbMock = {
    open: vi.fn(() => {
      const request: FakeRequest<unknown> = {
        result: undefined,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };

      const objectStore = {
        getAll: () => {
          const getAllRequest: FakeRequest<StoredConversationRecord[]> = {
            result: Array.from(store.values()),
            error: null,
            onsuccess: null,
            onerror: null,
          };
          flush(getAllRequest, 'onsuccess');
          return getAllRequest;
        },
        put: (conversation: StoredConversationRecord) => {
          store.set(conversation.id, conversation);
        },
        delete: (conversationId: string) => {
          store.delete(conversationId);
        },
      };

      request.result = {
        objectStoreNames: {
          contains: vi.fn(() => false),
        },
        createObjectStore: vi.fn(),
        transaction: () => {
          const transaction = {
            objectStore: () => objectStore,
            oncomplete: null as null | (() => void),
            onerror: null as null | (() => void),
            error: null,
          };

          queueMicrotask(() => {
            transaction.oncomplete?.();
          });

          return transaction;
        },
      };

      flush(request, 'onupgradeneeded');
      flush(request, 'onsuccess');

      return request;
    }),
  };

  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: indexedDbMock,
  });
});

test('chat-store saves and loads conversations sorted by recency', async () => {
  await saveConversation(sampleConversation);
  await saveConversation({
    ...sampleConversation,
    id: 'conversation-2',
    title: 'Second exchange',
    updatedAt: '2026-04-18T00:00:00.000Z',
  });

  await expect(loadConversations()).resolves.toEqual([
    expect.objectContaining({ id: 'conversation-2', title: 'Second exchange' }),
    expect.objectContaining({ id: 'conversation-1', title: 'First exchange' }),
  ]);
});

test('chat-store deletes a saved conversation', async () => {
  await saveConversation(sampleConversation);

  await deleteConversation(sampleConversation.id);

  await expect(loadConversations()).resolves.toEqual([]);
});

import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import type { StoredConversation } from '../../../lib/chat-store';
import { useChatTransfer } from './use-chat-transfer';

const {
  downloadBlobMock,
  exportConversationArchiveMock,
  exportConversationMock,
  importConversationFileMock,
  saveConversationMock,
} = vi.hoisted(() => ({
  downloadBlobMock: vi.fn(),
  exportConversationArchiveMock: vi.fn(),
  exportConversationMock: vi.fn(),
  importConversationFileMock: vi.fn(),
  saveConversationMock: vi.fn(async () => undefined),
}));

vi.mock('../../../lib/api-client', () => ({
  adminApiClient: {
    exportConversation: exportConversationMock,
    exportConversationArchive: exportConversationArchiveMock,
    importConversationFile: importConversationFileMock,
  },
}));

vi.mock('../lib/chat-conversation-utils', async () => {
  const actual = await vi.importActual<
    typeof import('../lib/chat-conversation-utils')
  >('../lib/chat-conversation-utils');

  return {
    ...actual,
    downloadBlob: downloadBlobMock,
  };
});

vi.mock('../../../lib/chat-store', async () => {
  const actual = await vi.importActual<
    typeof import('../../../lib/chat-store')
  >('../../../lib/chat-store');

  return {
    ...actual,
    saveConversation: saveConversationMock,
  };
});

function createConversation(
  overrides: Partial<StoredConversation> = {},
): StoredConversation {
  return {
    id: 'conversation-1',
    title: 'Thread',
    model: 'z-ai/glm-4.6:thinking',
    providerId: 'nanogpt',
    systemPrompt: 'You are a helpful assistant.',
    updatedAt: '2026-04-17T00:00:00.000Z',
    messages: [],
    ...overrides,
  };
}

function setup(conversations: StoredConversation[] = [createConversation()]) {
  let currentConversations = conversations;
  const setActiveConversationId = vi.fn();
  const setActivePanel = vi.fn();
  const setConversations = vi.fn((updater) => {
    currentConversations =
      typeof updater === 'function' ? updater(currentConversations) : updater;
  });

  const hook = renderHook(() =>
    useChatTransfer({
      conversations,
      scope: {
        userUuid: 'user-1',
        tenantId: 'tenant-1',
      },
      setActiveConversationId,
      setActivePanel,
      setConversations,
    }),
  );

  return {
    currentConversations: () => currentConversations,
    hook,
    setActiveConversationId,
    setActivePanel,
    setConversations,
  };
}

beforeEach(() => {
  downloadBlobMock.mockReset();
  exportConversationArchiveMock.mockReset();
  exportConversationMock.mockReset();
  importConversationFileMock.mockReset();
  saveConversationMock.mockClear();
});

test('useChatTransfer exports one conversation and the full archive', async () => {
  exportConversationMock.mockResolvedValue({
    blob: new Blob(['conversation']),
    fileName: 'thread.json',
  });
  exportConversationArchiveMock.mockResolvedValue({
    blob: new Blob(['archive']),
    fileName: 'threads.zip',
  });

  const { hook } = setup();

  await act(async () => {
    await hook.result.current.exportConversation(createConversation());
    await hook.result.current.exportAllConversations();
  });

  expect(downloadBlobMock).toHaveBeenNthCalledWith(
    1,
    expect.any(Blob),
    'thread.json',
  );
  expect(downloadBlobMock).toHaveBeenNthCalledWith(
    2,
    expect.any(Blob),
    'threads.zip',
  );
  expect(hook.result.current.transferError).toBeNull();
  expect(hook.result.current.isTransferBusy).toBe(false);
});

test('useChatTransfer skips archive export when there are no conversations', async () => {
  const { hook } = setup([]);

  await act(async () => {
    await hook.result.current.exportAllConversations();
  });

  expect(exportConversationArchiveMock).not.toHaveBeenCalled();
  expect(downloadBlobMock).not.toHaveBeenCalled();
});

test('useChatTransfer imports, persists, merges conversations, and activates the first imported one', async () => {
  importConversationFileMock.mockResolvedValue({
    conversations: [
      createConversation({
        id: 'conversation-2',
        title: 'Imported thread',
        updatedAt: '2026-04-18T00:00:00.000Z',
      }),
    ],
  });

  const {
    hook,
    currentConversations,
    setActiveConversationId,
    setActivePanel,
  } = setup([
    createConversation({
      id: 'conversation-1',
      title: 'Existing thread',
      updatedAt: '2026-04-17T00:00:00.000Z',
    }),
  ]);
  const file = new File(['{}'], 'conversation.json', {
    type: 'application/json',
  });

  await act(async () => {
    await hook.result.current.importConversationFile(file);
  });

  expect(saveConversationMock).toHaveBeenCalledWith(
    expect.objectContaining({
      id: 'conversation-2',
      ownerUserUuid: 'user-1',
      tenantId: 'tenant-1',
    }),
  );
  expect(currentConversations()[0]?.id).toBe('conversation-2');
  expect(setActiveConversationId).toHaveBeenCalledWith('conversation-2');
  expect(setActivePanel).toHaveBeenCalledWith('conversation');
});

test('useChatTransfer surfaces export and import failures with fallback messages', async () => {
  exportConversationMock.mockRejectedValue('unexpected export failure');
  importConversationFileMock.mockRejectedValue('unexpected import failure');

  const { hook } = setup();
  const file = new File(['{}'], 'conversation.json', {
    type: 'application/json',
  });

  await act(async () => {
    await hook.result.current.exportConversation(createConversation());
  });

  expect(hook.result.current.transferError).toBe(
    'The conversation export failed unexpectedly.',
  );

  await act(async () => {
    await hook.result.current.importConversationFile(file);
  });

  expect(hook.result.current.transferError).toBe(
    'The conversation import failed unexpectedly.',
  );
  expect(hook.result.current.isTransferBusy).toBe(false);
});

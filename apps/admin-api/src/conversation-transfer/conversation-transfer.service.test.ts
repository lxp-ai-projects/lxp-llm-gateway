import assert from 'node:assert/strict';
import test from 'node:test';

import { ConversationTransferService } from './conversation-transfer.service';

const conversationTransferService = new ConversationTransferService();

const baseConversation = {
  id: 'conversation-1',
  title: 'Perfume Ideas',
  model: 'z-ai/glm-4.6:thinking',
  providerId: 'nanogpt',
  systemPrompt: 'You are a helpful assistant.',
  updatedAt: '2026-04-16T00:00:00.000Z',
  messages: [
    {
      id: 'user-1',
      role: 'user' as const,
      content: 'Suggest perfumes',
      createdAt: '2026-04-16T00:00:00.000Z',
    },
    {
      id: 'assistant-1',
      role: 'assistant' as const,
      content: 'Here are three options.',
      reasoning: '1. detect taste',
      createdAt: '2026-04-16T00:00:01.000Z',
    },
  ],
};

test('ConversationTransferService exports and reimports a single JSON conversation', () => {
  const exported = conversationTransferService.exportConversation(baseConversation);
  const imported = conversationTransferService.importConversationFile(
    exported.fileName,
    exported.content,
  );

  assert.equal(imported.length, 1);
  assert.deepEqual(imported[0], baseConversation);
});

test('ConversationTransferService exports and reimports a ZIP archive of conversations', () => {
  const exported = conversationTransferService.exportConversationArchive([
    baseConversation,
    {
      ...baseConversation,
      id: 'conversation-2',
      title: 'Second conversation',
    },
  ]);

  const imported = conversationTransferService.importConversationFile(
    exported.fileName,
    exported.content,
  );

  assert.equal(imported.length, 2);
  assert.equal(imported[0]?.id, 'conversation-1');
  assert.equal(imported[1]?.id, 'conversation-2');
});

test('ConversationTransferService rejects malformed JSON imports', () => {
  assert.throws(
    () =>
      conversationTransferService.importConversationFile(
        'broken.json',
        Buffer.from('{not-json}', 'utf8'),
      ),
    /invalid/i,
  );
});

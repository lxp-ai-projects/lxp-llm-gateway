import { describe, expect, it } from 'vitest';

import type { StoredConversation } from './chat-store';
import {
  appendUserMessage,
  buildGatewayMessages,
  DEFAULT_SYSTEM_PROMPT,
  prepareConversationForAssistantRetry,
  prepareConversationForEditedUserMessage,
} from './chat-thread';

const baseConversation: StoredConversation = {
  id: 'conversation-1',
  title: 'Original',
  model: 'z-ai/glm-4.6:thinking',
  providerId: 'nanogpt',
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  updatedAt: '2026-04-16T00:00:00.000Z',
  messages: [
    { id: 'user-1', role: 'user', content: 'hello', createdAt: '2026-04-16T00:00:00.000Z' },
    {
      id: 'assistant-1',
      role: 'assistant',
      content: 'hello back',
      reasoning: 'thinking',
      createdAt: '2026-04-16T00:00:01.000Z',
    },
    { id: 'user-2', role: 'user', content: 'second ask', createdAt: '2026-04-16T00:00:02.000Z' },
    { id: 'assistant-2', role: 'assistant', content: 'second reply', createdAt: '2026-04-16T00:00:03.000Z' },
  ],
};

describe('chat-thread', () => {
  it('appends a user message to the active conversation', () => {
    const updated = appendUserMessage(baseConversation, {
      id: 'user-3',
      role: 'user',
      content: 'third ask',
      createdAt: '2026-04-16T00:00:04.000Z',
    });

    expect(updated.messages.at(-1)?.id).toBe('user-3');
    expect(updated.title).toBe('third ask');
  });

  it('truncates the thread after an edited user message', () => {
    const updated = prepareConversationForEditedUserMessage(baseConversation, 'user-1', 'edited first ask');

    expect(updated.messages).toHaveLength(1);
    expect(updated.messages[0]?.content).toBe('edited first ask');
    expect(updated.title).toBe('edited first ask');
  });

  it('truncates the thread before an assistant message for retry', () => {
    const updated = prepareConversationForAssistantRetry(baseConversation, 'assistant-2');

    expect(updated.messages.map((message) => message.id)).toEqual(['user-1', 'assistant-1', 'user-2']);
    expect(updated.title).toBe('second ask');
  });

  it('prepends a system message when the conversation defines one', () => {
    const gatewayMessages = buildGatewayMessages(baseConversation);

    expect(gatewayMessages[0]).toEqual({
      role: 'system',
      content: DEFAULT_SYSTEM_PROMPT,
    });
    expect(gatewayMessages[1]).toEqual({
      role: 'user',
      content: 'hello',
    });
  });

  it('omits the system message when the prompt is blank', () => {
    const gatewayMessages = buildGatewayMessages({
      ...baseConversation,
      systemPrompt: '   ',
    });

    expect(gatewayMessages[0]).toEqual({
      role: 'user',
      content: 'hello',
    });
  });
});

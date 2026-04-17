import type { GatewayChatMessage } from './api-client';
import type { StoredConversation, StoredConversationMessage } from './chat-store';

export const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful assistant. Follow the application base guardrails and safety constraints.';

export function buildGatewayMessages(conversation: StoredConversation): GatewayChatMessage[] {
  const systemPrompt = conversation.systemPrompt?.trim();
  const systemMessage = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }]
    : [];

  return [
    ...systemMessage,
    ...conversation.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

export function appendUserMessage(
  conversation: StoredConversation,
  message: StoredConversationMessage,
): StoredConversation {
  return {
    ...conversation,
    messages: [...conversation.messages, message],
    updatedAt: new Date().toISOString(),
    title: message.content.slice(0, 48) || conversation.title,
  };
}

export function prepareConversationForEditedUserMessage(
  conversation: StoredConversation,
  messageId: string,
  editedContent: string,
): StoredConversation {
  const targetIndex = conversation.messages.findIndex(
    (message) => message.id === messageId && message.role === 'user',
  );

  if (targetIndex === -1) {
    throw new Error('The selected user message could not be found for editing.');
  }

  const targetMessage = conversation.messages[targetIndex]!;
  const updatedMessage: StoredConversationMessage = {
    ...targetMessage,
    content: editedContent,
  };

  return {
    ...conversation,
    title: editedContent.slice(0, 48) || conversation.title,
    updatedAt: new Date().toISOString(),
    messages: [...conversation.messages.slice(0, targetIndex), updatedMessage],
  };
}

export function prepareConversationForAssistantRetry(
  conversation: StoredConversation,
  assistantMessageId: string,
): StoredConversation {
  const assistantIndex = conversation.messages.findIndex(
    (message) => message.id === assistantMessageId && message.role === 'assistant',
  );

  if (assistantIndex === -1) {
    throw new Error('The selected assistant message could not be found for retry.');
  }

  const previousUserMessage = [...conversation.messages.slice(0, assistantIndex)]
    .reverse()
    .find((message) => message.role === 'user');

  if (!previousUserMessage) {
    throw new Error('No user message was found before the selected assistant response.');
  }

  return {
    ...conversation,
    title: previousUserMessage.content.slice(0, 48) || conversation.title,
    updatedAt: new Date().toISOString(),
    messages: conversation.messages.slice(0, assistantIndex),
  };
}

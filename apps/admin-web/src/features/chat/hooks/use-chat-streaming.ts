import { useState } from 'react';

import { gatewayApiClient } from '../../../lib/api-client';
import { shouldFlagMissingAssistantContent } from '../../../lib/chat-stream';
import {
  appendUserMessage,
  buildGatewayMessages,
  prepareConversationForAssistantRetry,
  prepareConversationForEditedUserMessage,
} from '../../../lib/chat-thread';
import { createClientId } from '../../../lib/id';
import {
  saveConversation,
  type StoredConversation,
} from '../../../lib/chat-store';

type UseChatStreamingOptions = {
  activeConversation: StoredConversation | null;
  editingContent: string;
  onClearEditingState: () => void;
  onConversationActivated: (conversationId: string) => void;
  onConversationUpdated: React.Dispatch<
    React.SetStateAction<StoredConversation[]>
  >;
  onPromptCleared: () => void;
  onSetAutoScrollEnabled: (value: boolean) => void;
  onSetChatError: (value: string | null) => void;
  onStreamingChange?: (value: boolean) => void;
};

export function useChatStreaming({
  activeConversation,
  editingContent,
  onClearEditingState,
  onConversationActivated,
  onConversationUpdated,
  onPromptCleared,
  onSetAutoScrollEnabled,
  onSetChatError,
  onStreamingChange,
}: UseChatStreamingOptions) {
  const [isStreaming, setIsStreaming] = useState(false);

  async function streamAssistantResponse(
    baseConversation: StoredConversation,
  ): Promise<void> {
    const assistantMessageId = createClientId();
    const draftAssistantMessage = {
      id: assistantMessageId,
      role: 'assistant' as const,
      content: '',
      reasoning: '',
      createdAt: new Date().toISOString(),
    };

    const nextConversation: StoredConversation = {
      ...baseConversation,
      messages: [...baseConversation.messages, draftAssistantMessage],
      updatedAt: new Date().toISOString(),
    };

    let streamedReasoning = '';
    let streamedContent = '';

    onSetChatError(null);
    setIsStreaming(true);
    onStreamingChange?.(true);
    onSetAutoScrollEnabled(true);
    onConversationActivated(nextConversation.id);
    onClearEditingState();
    onConversationUpdated((current) => {
      const withoutCurrent = current.filter(
        (entry) => entry.id !== nextConversation.id,
      );
      return [nextConversation, ...withoutCurrent];
    });

    try {
      const streamResult = await gatewayApiClient.chatStream(
        {
          providerId: baseConversation.providerId,
          model: baseConversation.model,
          maxOutputTokens: baseConversation.maxOutputTokens,
          providerOptions: baseConversation.providerOptions,
          stream: true,
          messages: buildGatewayMessages(baseConversation),
        },
        {
          onChunk: ({ reasoningDelta, contentDelta }) => {
            streamedReasoning += reasoningDelta ?? '';
            streamedContent += contentDelta ?? '';
            onConversationUpdated((current) =>
              current.map((conversation) => {
                if (conversation.id !== nextConversation.id) {
                  return conversation;
                }

                return {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  messages: conversation.messages.map((message) => {
                    if (message.id !== assistantMessageId) {
                      return message;
                    }

                    return {
                      ...message,
                      reasoning: `${message.reasoning ?? ''}${reasoningDelta ?? ''}`,
                      content: `${message.content}${contentDelta ?? ''}`,
                    };
                  }),
                };
              }),
            );
          },
        },
      );

      const persistedConversation: StoredConversation = {
        ...nextConversation,
        updatedAt: new Date().toISOString(),
        messages: nextConversation.messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                reasoning: streamedReasoning,
                content: streamedContent,
              }
            : message,
        ),
      };

      onConversationUpdated((current) => [
        persistedConversation,
        ...current.filter(
          (conversation) => conversation.id !== nextConversation.id,
        ),
      ]);
      await saveConversation(persistedConversation);

      if (
        shouldFlagMissingAssistantContent(streamedContent) &&
        !streamedReasoning.trim()
      ) {
        onSetChatError(
          streamResult.receivedReasoning
            ? 'The model stream ended without any assistant response content.'
            : 'The model stream ended before any assistant output was received.',
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'The gateway stream failed unexpectedly.';
      onSetChatError(message);
      onConversationUpdated((current) => {
        const updatedConversation = current.find(
          (conversation) => conversation.id === nextConversation.id,
        );
        if (!updatedConversation) {
          return current;
        }

        const hasPartialAssistantOutput = Boolean(
          streamedReasoning.trim() || streamedContent.trim(),
        );
        const nextMessages = hasPartialAssistantOutput
          ? updatedConversation.messages
          : updatedConversation.messages.filter(
              (entry) => entry.id !== assistantMessageId,
            );

        const persistedConversation: StoredConversation = {
          ...updatedConversation,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        };

        void saveConversation(persistedConversation);

        return [
          persistedConversation,
          ...current.filter(
            (conversation) => conversation.id !== nextConversation.id,
          ),
        ];
      });
    } finally {
      setIsStreaming(false);
      onStreamingChange?.(false);
    }
  }

  async function sendMessage(
    conversationFactory: () => StoredConversation,
    nextPrompt: string,
  ): Promise<void> {
    const userMessage = {
      id: createClientId(),
      role: 'user' as const,
      content: nextPrompt,
      createdAt: new Date().toISOString(),
    };

    onPromptCleared();
    await streamAssistantResponse(
      appendUserMessage(conversationFactory(), userMessage),
    );
  }

  async function resendEditedMessage(
    withCurrentSystemPrompt: (
      conversation: StoredConversation,
    ) => StoredConversation,
    messageId: string,
  ): Promise<void> {
    if (!activeConversation) {
      return;
    }

    try {
      await streamAssistantResponse(
        prepareConversationForEditedUserMessage(
          withCurrentSystemPrompt(activeConversation),
          messageId,
          editingContent.trim(),
        ),
      );
    } catch (error) {
      onSetChatError(
        error instanceof Error
          ? error.message
          : 'The selected user message could not be resent.',
      );
    }
  }

  async function retryAssistantMessage(
    withCurrentSystemPrompt: (
      conversation: StoredConversation,
    ) => StoredConversation,
    messageId: string,
  ): Promise<void> {
    if (!activeConversation) {
      return;
    }

    try {
      await streamAssistantResponse(
        prepareConversationForAssistantRetry(
          withCurrentSystemPrompt(activeConversation),
          messageId,
        ),
      );
    } catch (error) {
      onSetChatError(
        error instanceof Error
          ? error.message
          : 'The selected assistant response could not be retried.',
      );
    }
  }

  return {
    isStreaming,
    resendEditedMessage,
    retryAssistantMessage,
    sendMessage,
  };
}

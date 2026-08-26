import { useState } from 'react';

import { gatewayApiClient } from '../../../lib/api-client';
import { getLocalizedErrorMessage } from '../../../i18n/errors';
import {
  isTruncatedAssistantFinishReason,
  shouldFlagMissingAssistantContent,
} from '../../../lib/chat-stream';
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
import type { GatewayChatReasoningRequest } from '../../../lib/api-client.types';

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
  onSetChatWarning: (value: string | null) => void;
  onStreamingChange?: (value: boolean) => void;
  shouldReplayReasoning?: (conversation: StoredConversation) => boolean;
  resolveReasoning?: (
    conversation: StoredConversation,
  ) => GatewayChatReasoningRequest | undefined;
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
  onSetChatWarning,
  onStreamingChange,
  shouldReplayReasoning,
  resolveReasoning,
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
    const streamedReasoningDetails: unknown[] = [];
    let streamedContent = '';

    onSetChatError(null);
    onSetChatWarning(null);
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
      const reasoning = resolveReasoning?.(baseConversation);
      const streamResult = await gatewayApiClient.chatStream(
        {
          providerId: baseConversation.providerId,
          model: baseConversation.model,
          reasoning,
          providerOptions: reasoning
            ? undefined
            : baseConversation.providerOptions,
          stream: true,
          messages: buildGatewayMessages(baseConversation, {
            includeAssistantReasoning:
              shouldReplayReasoning?.(baseConversation) ?? false,
          }),
        },
        {
          onChunk: ({
            reasoningDelta,
            reasoningDetailsDelta,
            contentDelta,
          }) => {
            streamedReasoning += reasoningDelta ?? '';
            if (Array.isArray(reasoningDetailsDelta)) {
              streamedReasoningDetails.push(...reasoningDetailsDelta);
            } else if (reasoningDetailsDelta !== undefined) {
              streamedReasoningDetails.push(reasoningDetailsDelta);
            }
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
                      ...(streamedReasoningDetails.length
                        ? { reasoningDetails: [...streamedReasoningDetails] }
                        : {}),
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
                ...(streamedReasoningDetails.length
                  ? { reasoningDetails: streamedReasoningDetails }
                  : {}),
                content: streamedContent,
                finishReason: streamResult.finishReason ?? null,
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
      } else if (isTruncatedAssistantFinishReason(streamResult.finishReason)) {
        onSetChatWarning(
          'The assistant response stopped at the model output limit and may be incomplete.',
        );
      }
    } catch (error) {
      const message = getLocalizedErrorMessage(error);
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
      onSetChatError(getLocalizedErrorMessage(error));
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
      onSetChatError(getLocalizedErrorMessage(error));
    }
  }

  return {
    isStreaming,
    resendEditedMessage,
    retryAssistantMessage,
    sendMessage,
  };
}

import { useCallback, useEffect, useState } from 'react';

import type { GatewayChatProviderOptions } from '../../../lib/api-client.types';
import type {
  ConversationScope,
  StoredConversation,
} from '../../../lib/chat-store';
import {
  deleteConversation,
  loadConversations,
  saveConversation,
} from '../../../lib/chat-store';
import { DEFAULT_SYSTEM_PROMPT } from '../../../lib/chat-thread';
import { createConversation as createLocalConversation } from '../lib/chat-conversation-utils';

type UseChatConversationsOptions = {
  providerId: string;
  model: string;
  maxOutputTokens?: number;
  scope: ConversationScope;
  onResetComposerState: () => void;
  onSetChatError: (value: string | null) => void;
  onSetActivePanel: (value: 'conversation' | 'system-prompt') => void;
};

export function useChatConversations({
  providerId,
  model,
  maxOutputTokens,
  scope,
  onResetComposerState,
  onSetChatError,
  onSetActivePanel,
}: UseChatConversationsOptions) {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [conversationPendingDeletion, setConversationPendingDeletion] =
    useState<StoredConversation | null>(null);

  useEffect(() => {
    loadConversations(scope)
      .then((storedConversations) => {
        setConversations(storedConversations);
        setActiveConversationId(storedConversations[0]?.id ?? null);
      })
      .catch(() => {
        setConversations([]);
      });
  }, [scope]);

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;

  useEffect(() => {
    setSystemPrompt(activeConversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT);
  }, [activeConversation?.id, activeConversation?.systemPrompt]);

  const createConversation = useCallback(async (
    providerOptions?: GatewayChatProviderOptions,
  ): Promise<void> => {
    const conversation = createLocalConversation(
      scope,
      providerId,
      model,
      maxOutputTokens,
      providerOptions,
      systemPrompt.trim(),
    );
    await saveConversation(conversation);
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
  }, [maxOutputTokens, model, providerId, scope, systemPrompt]);

  const persistConversationProvider = useCallback(async (
    nextProviderId: string,
    nextModel: string,
    nextProviderOptions?: StoredConversation['providerOptions'],
  ): Promise<void> => {
    if (!activeConversation) {
      return;
    }

    const updatedConversation: StoredConversation = {
      ...activeConversation,
      providerId: nextProviderId,
      model: nextModel,
      maxOutputTokens: activeConversation.maxOutputTokens,
      providerOptions: nextProviderOptions,
      updatedAt: new Date().toISOString(),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === updatedConversation.id
          ? updatedConversation
          : conversation,
      ),
    );
    await saveConversation(updatedConversation);
  }, [activeConversation]);

  const persistConversationModel = useCallback(async (
    nextModel: string,
    nextProviderOptions?: StoredConversation['providerOptions'],
  ): Promise<void> => {
    if (!activeConversation) {
      return;
    }

    const updatedConversation: StoredConversation = {
      ...activeConversation,
      model: nextModel,
      maxOutputTokens: activeConversation.maxOutputTokens,
      providerOptions: nextProviderOptions,
      updatedAt: new Date().toISOString(),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === updatedConversation.id
          ? updatedConversation
          : conversation,
      ),
    );
    await saveConversation(updatedConversation);
  }, [activeConversation]);

  const persistConversationProviderOptions = useCallback(async (
    nextProviderOptions?: StoredConversation['providerOptions'],
  ): Promise<void> => {
    if (!activeConversation) {
      return;
    }

    const updatedConversation: StoredConversation = {
      ...activeConversation,
      maxOutputTokens: activeConversation.maxOutputTokens,
      providerOptions: nextProviderOptions,
      updatedAt: new Date().toISOString(),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === updatedConversation.id
          ? updatedConversation
          : conversation,
      ),
    );
    await saveConversation(updatedConversation);
  }, [activeConversation]);

  const persistConversationSystemPrompt = useCallback(async (
    nextSystemPrompt: string,
  ): Promise<void> => {
    setSystemPrompt(nextSystemPrompt);

    if (!activeConversation) {
      return;
    }

    const updatedConversation: StoredConversation = {
      ...activeConversation,
      systemPrompt: nextSystemPrompt,
      updatedAt: new Date().toISOString(),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === updatedConversation.id
          ? updatedConversation
          : conversation,
      ),
    );
    await saveConversation(updatedConversation);
  }, [activeConversation]);

  const persistConversationMaxOutputTokens = useCallback(async (
    nextMaxOutputTokens?: number,
  ): Promise<void> => {
    if (!activeConversation) {
      return;
    }

    const updatedConversation: StoredConversation = {
      ...activeConversation,
      maxOutputTokens: nextMaxOutputTokens,
      updatedAt: new Date().toISOString(),
    };

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === updatedConversation.id
          ? updatedConversation
          : conversation,
      ),
    );
    await saveConversation(updatedConversation);
  }, [activeConversation]);

  const confirmConversationDeletion = useCallback(async (): Promise<void> => {
    const targetConversation = conversationPendingDeletion;
    if (!targetConversation) {
      return;
    }

    await deleteConversation(targetConversation.id);
    const nextConversations = conversations.filter(
      (conversation) => conversation.id !== targetConversation.id,
    );

    setConversations(nextConversations);
    setConversationPendingDeletion(null);

    if (activeConversationId === targetConversation.id) {
      setActiveConversationId(nextConversations[0]?.id ?? null);
      onSetActivePanel('conversation');
      onSetChatError(null);
      onResetComposerState();
    }
  }, [
    activeConversationId,
    conversationPendingDeletion,
    conversations,
    onResetComposerState,
    onSetActivePanel,
    onSetChatError,
  ]);

  return {
    activeConversation,
    activeConversationId,
    confirmConversationDeletion,
    conversationPendingDeletion,
    conversations,
    createConversation,
    persistConversationModel,
    persistConversationMaxOutputTokens,
    persistConversationProvider,
    persistConversationProviderOptions,
    persistConversationSystemPrompt,
    setActiveConversationId,
    setConversationPendingDeletion,
    setConversations,
    setSystemPrompt,
    systemPrompt,
  };
}

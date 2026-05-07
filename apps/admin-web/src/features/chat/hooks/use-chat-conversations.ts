import { useEffect, useRef, useState } from 'react';

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
  const conversationsRef = useRef<StoredConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [conversationPendingDeletion, setConversationPendingDeletion] =
    useState<StoredConversation | null>(null);

  useEffect(() => {
    loadConversations(scope)
      .then((storedConversations) => {
        conversationsRef.current = storedConversations;
        setConversations(storedConversations);
        setActiveConversationId(storedConversations[0]?.id ?? null);
      })
      .catch(() => {
        conversationsRef.current = [];
        setConversations([]);
      });
  }, [scope]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const activeConversation =
    conversations.find(
      (conversation) => conversation.id === activeConversationId,
    ) ?? null;

  useEffect(() => {
    setSystemPrompt(activeConversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT);
  }, [activeConversation?.id, activeConversation?.systemPrompt]);

  function updateActiveConversation(
    mutate: (conversation: StoredConversation) => StoredConversation,
  ): StoredConversation | null {
    if (!activeConversationId) {
      return null;
    }

    const currentConversation = conversationsRef.current.find(
      (conversation) => conversation.id === activeConversationId,
    );

    if (!currentConversation) {
      return null;
    }

    const updatedConversation = mutate(currentConversation);
    const nextConversations = conversationsRef.current.map((conversation) =>
      conversation.id === activeConversationId ? updatedConversation : conversation,
    );

    conversationsRef.current = nextConversations;
    setConversations(nextConversations);

    return updatedConversation;
  }

  async function createConversation(
    providerOptions?: GatewayChatProviderOptions,
  ): Promise<void> {
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
  }

  async function persistConversationProvider(
    nextProviderId: string,
    nextModel: string,
    nextProviderOptions?: StoredConversation['providerOptions'],
  ): Promise<void> {
    const updatedConversation = updateActiveConversation((conversation) => ({
      ...conversation,
      providerId: nextProviderId,
      model: nextModel,
      providerOptions: nextProviderOptions,
      updatedAt: new Date().toISOString(),
    }));

    if (!updatedConversation) {
      return;
    }

    await saveConversation(updatedConversation);
  }

  async function persistConversationModel(
    nextModel: string,
    nextProviderOptions?: StoredConversation['providerOptions'],
  ): Promise<void> {
    const updatedConversation = updateActiveConversation((conversation) => ({
      ...conversation,
      model: nextModel,
      providerOptions: nextProviderOptions,
      updatedAt: new Date().toISOString(),
    }));

    if (!updatedConversation) {
      return;
    }

    await saveConversation(updatedConversation);
  }

  async function persistConversationProviderOptions(
    nextProviderOptions?: StoredConversation['providerOptions'],
  ): Promise<void> {
    const updatedConversation = updateActiveConversation((conversation) => ({
      ...conversation,
      providerOptions: nextProviderOptions,
      updatedAt: new Date().toISOString(),
    }));

    if (!updatedConversation) {
      return;
    }

    await saveConversation(updatedConversation);
  }

  async function persistConversationSystemPrompt(
    nextSystemPrompt: string,
  ): Promise<void> {
    setSystemPrompt(nextSystemPrompt);

    const updatedConversation = updateActiveConversation((conversation) => ({
      ...conversation,
      systemPrompt: nextSystemPrompt,
      updatedAt: new Date().toISOString(),
    }));

    if (!updatedConversation) {
      return;
    }

    await saveConversation(updatedConversation);
  }

  async function persistConversationMaxOutputTokens(
    nextMaxOutputTokens?: number,
  ): Promise<void> {
    const updatedConversation = updateActiveConversation((conversation) => ({
      ...conversation,
      maxOutputTokens: nextMaxOutputTokens,
      updatedAt: new Date().toISOString(),
    }));

    if (!updatedConversation) {
      return;
    }

    await saveConversation(updatedConversation);
  }

  async function confirmConversationDeletion(): Promise<void> {
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
  }

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

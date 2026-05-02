import { useState, type Dispatch, type SetStateAction } from 'react';

import { adminApiClient } from '../../../lib/api-client';
import {
  type ConversationScope,
  saveConversation,
  type StoredConversation,
} from '../../../lib/chat-store';
import {
  downloadBlob,
  mergeConversations,
} from '../lib/chat-conversation-utils';

type UseChatTransferOptions = {
  conversations: StoredConversation[];
  scope: ConversationScope;
  setActiveConversationId: (value: string | null) => void;
  setActivePanel: (value: 'conversation' | 'system-prompt') => void;
  setConversations: Dispatch<SetStateAction<StoredConversation[]>>;
};

export function useChatTransfer({
  conversations,
  scope,
  setActiveConversationId,
  setActivePanel,
  setConversations,
}: UseChatTransferOptions) {
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferBusy, setIsTransferBusy] = useState(false);

  async function exportConversation(
    conversation: StoredConversation,
  ): Promise<void> {
    setTransferError(null);
    setIsTransferBusy(true);

    try {
      const exported = await adminApiClient.exportConversation(conversation);
      downloadBlob(
        exported.blob,
        exported.fileName ?? `${conversation.title}.json`,
      );
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : 'The conversation export failed unexpectedly.',
      );
    } finally {
      setIsTransferBusy(false);
    }
  }

  async function exportAllConversations(): Promise<void> {
    if (!conversations.length) {
      return;
    }

    setTransferError(null);
    setIsTransferBusy(true);

    try {
      const exported =
        await adminApiClient.exportConversationArchive(conversations);
      downloadBlob(
        exported.blob,
        exported.fileName ?? 'lxp-chat-conversations.zip',
      );
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : 'The conversation archive export failed unexpectedly.',
      );
    } finally {
      setIsTransferBusy(false);
    }
  }

  async function importConversationFile(file: File): Promise<void> {
    setTransferError(null);
    setIsTransferBusy(true);

    try {
      const imported = await adminApiClient.importConversationFile(file);
      const scopedConversations = imported.conversations.map((conversation) => ({
        ...conversation,
        ownerUserUuid: scope.userUuid,
        tenantId: scope.tenantId,
      }));
      for (const conversation of scopedConversations) {
        await saveConversation(conversation);
      }

      const mergedConversations = mergeConversations(
        conversations,
        scopedConversations,
      );
      setConversations(mergedConversations);
      setActiveConversationId(
        scopedConversations[0]?.id ?? mergedConversations[0]?.id ?? null,
      );
      setActivePanel('conversation');
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : 'The conversation import failed unexpectedly.',
      );
    } finally {
      setIsTransferBusy(false);
    }
  }

  return {
    exportAllConversations,
    exportConversation,
    importConversationFile,
    isTransferBusy,
    transferError,
  };
}

import { createClientId } from '../../../lib/id';
import type { StoredConversation } from '../../../lib/chat-store';

export function createConversation(
  model: string,
  systemPrompt: string,
): StoredConversation {
  return {
    id: createClientId(),
    title: 'New conversation',
    model,
    providerId: 'nanogpt',
    systemPrompt,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}

export function mergeConversations(
  existingConversations: StoredConversation[],
  importedConversations: StoredConversation[],
): StoredConversation[] {
  const merged = new Map(
    existingConversations.map((conversation) => [
      conversation.id,
      conversation,
    ]),
  );

  for (const conversation of importedConversations) {
    merged.set(conversation.id, conversation);
  }

  return [...merged.values()].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}

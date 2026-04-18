import { ActionIcon, Alert, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
import {
  IconDownload,
  IconMessageCircleBolt,
  IconTrash,
  IconUpload,
} from '@tabler/icons-react';

import type { StoredConversation } from '../../../lib/chat-store';

type ChatSidebarProps = {
  activeConversationId: string | null;
  conversations: StoredConversation[];
  isStreaming: boolean;
  isTransferBusy: boolean;
  transferError: string | null;
  onCreateConversation: () => void;
  onDeleteConversation: (conversation: StoredConversation) => void;
  onExportAllConversations: () => void;
  onExportConversation: (conversation: StoredConversation) => void;
  onImportConversations: () => void;
  onSelectConversation: (conversationId: string) => void;
};

export function ChatSidebar({
  activeConversationId,
  conversations,
  isStreaming,
  isTransferBusy,
  transferError,
  onCreateConversation,
  onDeleteConversation,
  onExportAllConversations,
  onExportConversation,
  onImportConversations,
  onSelectConversation,
}: ChatSidebarProps) {
  return (
    <Card className="section-card" h="100%">
      <Group justify="space-between" mb="md">
        <Title order={3}>Local conversations</Title>
        <Group gap="xs">
          <ActionIcon
            aria-label="Import conversations"
            data-testid="chat-import-conversations"
            disabled={isTransferBusy}
            onClick={onImportConversations}
            variant="light"
          >
            <IconUpload size={18} />
          </ActionIcon>
          <ActionIcon
            aria-label="Export all conversations"
            data-testid="chat-export-all-conversations"
            disabled={!conversations.length || isTransferBusy}
            onClick={onExportAllConversations}
            variant="light"
          >
            <IconDownload size={18} />
          </ActionIcon>
          <ActionIcon
            aria-label="Create conversation"
            data-testid="chat-create-conversation"
            onClick={onCreateConversation}
            variant="light"
          >
            <IconMessageCircleBolt size={18} />
          </ActionIcon>
        </Group>
      </Group>
      <Stack gap="sm">
        {transferError ? (
          <Alert color="red" title="Conversation transfer failed">
            {transferError}
          </Alert>
        ) : null}
        {conversations.length === 0 ? (
          <Text c="dimmed" size="sm">
            No local chat history yet. Conversations are stored only in this browser via IndexedDB.
          </Text>
        ) : (
          conversations.map((conversation) => (
            <Group key={conversation.id} gap="xs" wrap="nowrap">
              <Button
                data-testid={`chat-conversation-select-${conversation.id}`}
                justify="space-between"
                onClick={() => onSelectConversation(conversation.id)}
                style={{ flex: 1 }}
                variant={conversation.id === activeConversationId ? 'filled' : 'light'}
              >
                {conversation.title}
              </Button>
              <ActionIcon
                aria-label={`Export ${conversation.title}`}
                data-testid={`chat-conversation-export-${conversation.id}`}
                disabled={isTransferBusy}
                onClick={() => onExportConversation(conversation)}
                variant="light"
              >
                <IconDownload size={16} />
              </ActionIcon>
              <ActionIcon
                aria-label={`Delete ${conversation.title}`}
                data-testid={`chat-conversation-delete-${conversation.id}`}
                color="red"
                disabled={isStreaming}
                onClick={() => onDeleteConversation(conversation)}
                variant="light"
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          ))
        )}
      </Stack>
    </Card>
  );
}

import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBrain,
  IconCheck,
  IconCopy,
  IconPencil,
  IconRotateClockwise2,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import type { UIEventHandler } from 'react';

import { MarkdownText } from '../../../components/markdown-text';
import type { StoredConversation } from '../../../lib/chat-store';
import { getProviderModelLoadingNote } from '../../providers/lib/provider-utils';

type ChatMessageListProps = {
  activeConversation: StoredConversation | null;
  chatError: string | null;
  copiedAssistantMessageId: string | null;
  editingContent: string;
  editingMessageId: string | null;
  hiddenMessageCountAbove: number;
  hiddenMessageCountBelow: number;
  isLoadingModels: boolean;
  isStreaming: boolean;
  model: string;
  providerId: string;
  modelsErrorMessage: string | null;
  onCancelEdit: () => void;
  onCopyAssistantMessage: (messageId: string, content: string) => void;
  onEditContentChange: (value: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onLoadEarlierMessages: () => void;
  onLoadNewerMessages: () => void;
  onRetryAssistantMessage: (messageId: string) => void;
  onScroll: UIEventHandler<HTMLDivElement>;
  onSubmitEditedMessage: (messageId: string) => void;
  renderedMessages: StoredConversation['messages'];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  userDisplayName: string;
};

export function ChatMessageList({
  activeConversation,
  chatError,
  copiedAssistantMessageId,
  editingContent,
  editingMessageId,
  hiddenMessageCountAbove,
  hiddenMessageCountBelow,
  isLoadingModels,
  isStreaming,
  model,
  providerId,
  modelsErrorMessage,
  onCancelEdit,
  onCopyAssistantMessage,
  onEditContentChange,
  onEditMessage,
  onLoadEarlierMessages,
  onLoadNewerMessages,
  onRetryAssistantMessage,
  onScroll,
  onSubmitEditedMessage,
  renderedMessages,
  scrollRef,
  userDisplayName,
}: ChatMessageListProps) {
  return (
    <Stack gap="md">
      {modelsErrorMessage ? (
        <Alert
          color="red"
          icon={<IconAlertCircle size={18} />}
          title="Model loading failed"
        >
          {modelsErrorMessage}
        </Alert>
      ) : null}
      {modelsErrorMessage && getProviderModelLoadingNote(providerId) ? (
        <Alert color="blue" title="Provider model access note">
          {getProviderModelLoadingNote(providerId)}
        </Alert>
      ) : null}

      {chatError ? (
        <Alert
          color="red"
          icon={<IconAlertCircle size={18} />}
          title="Chat request failed"
        >
          {chatError}
        </Alert>
      ) : null}

      <div
        ref={scrollRef}
        className="chat-scroll chat-scroll-with-composer"
        onScroll={onScroll}
      >
        {hiddenMessageCountAbove > 0 ? (
          <Button
            data-testid="chat-load-earlier-messages"
            onClick={onLoadEarlierMessages}
            size="compact-xs"
            variant="subtle"
          >
            Load {Math.min(10, hiddenMessageCountAbove)} earlier message
            {hiddenMessageCountAbove > 1 ? 's' : ''}
          </Button>
        ) : null}
        {renderedMessages.length ? (
          renderedMessages.map((message) => (
            <div
              key={message.id}
              className={`chat-bubble ${message.role === 'assistant' ? 'assistant' : 'user'} ${
                isStreaming &&
                message.role === 'assistant' &&
                message.id === activeConversation?.messages.at(-1)?.id
                  ? 'streaming'
                  : ''
              }`}
            >
              <Group justify="space-between" mb="xs">
                <Text fw={700} tt="capitalize">
                  {message.role === 'user' ? userDisplayName : message.role}
                </Text>
                <Group gap={6}>
                  {message.reasoning ? (
                    <ThemeIcon
                      color="brass"
                      radius="xl"
                      size="sm"
                      variant="light"
                    >
                      <IconBrain size={14} />
                    </ThemeIcon>
                  ) : null}
                  {!isStreaming && message.role === 'user' ? (
                    <ActionIcon
                      aria-label="Edit message"
                      data-testid={`chat-edit-message-${message.id}`}
                      onClick={() => onEditMessage(message.id, message.content)}
                      size="sm"
                      variant="subtle"
                    >
                      <IconPencil size={14} />
                    </ActionIcon>
                  ) : null}
                  {!isStreaming && message.role === 'assistant' ? (
                    <ActionIcon
                      aria-label="Retry response"
                      data-testid={`chat-retry-message-${message.id}`}
                      onClick={() => onRetryAssistantMessage(message.id)}
                      size="sm"
                      variant="subtle"
                    >
                      <IconRotateClockwise2 size={14} />
                    </ActionIcon>
                  ) : null}
                </Group>
              </Group>
              {editingMessageId === message.id ? (
                <Stack gap="xs">
                  <Textarea
                    autosize
                    data-testid={`chat-edit-input-${message.id}`}
                    minRows={3}
                    onChange={(event) =>
                      onEditContentChange(event.currentTarget.value)
                    }
                    value={editingContent}
                  />
                  <Group justify="flex-end">
                    <Button
                      data-testid={`chat-cancel-edit-${message.id}`}
                      leftSection={<IconX size={14} />}
                      onClick={onCancelEdit}
                      size="xs"
                      variant="subtle"
                    >
                      Cancel
                    </Button>
                    <Button
                      data-testid={`chat-resend-message-${message.id}`}
                      disabled={!editingContent.trim()}
                      leftSection={<IconSend size={14} />}
                      onClick={() => onSubmitEditedMessage(message.id)}
                      size="xs"
                    >
                      Resend
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <>
                  {message.reasoning && model.includes('thinking') ? (
                    <Card className="reasoning-card" mb="sm" p="sm">
                      <Text size="xs" fw={700} tt="uppercase">
                        Reasoning
                      </Text>
                      <MarkdownText dimmed value={message.reasoning} />
                    </Card>
                  ) : null}
                  {message.content ? (
                    <>
                      <MarkdownText value={message.content} />
                      {!isStreaming ? (
                        <Group justify="flex-end" mt="sm">
                          <Button
                            data-testid={`chat-copy-message-${message.id}`}
                            leftSection={
                              copiedAssistantMessageId === message.id ? (
                                <IconCheck size={14} />
                              ) : (
                                <IconCopy size={14} />
                              )
                            }
                            onClick={() =>
                              onCopyAssistantMessage(
                                message.id,
                                message.content,
                              )
                            }
                            size="xs"
                            variant="subtle"
                          >
                            {copiedAssistantMessageId === message.id
                              ? 'Copied'
                              : 'Copy'}
                          </Button>
                        </Group>
                      ) : null}
                    </>
                  ) : message.reasoning ? (
                    <Text className="message-text" c="dimmed" fs="italic">
                      Assistant response was interrupted before content
                      generation completed.
                    </Text>
                  ) : (
                    <Text className="message-text" c="dimmed" fs="italic">
                      No assistant response content was received.
                    </Text>
                  )}
                </>
              )}
            </div>
          ))
        ) : (
          <Text c="dimmed" size="sm">
            Start a conversation to verify provider behavior, model output, and
            optional thinking traces.
          </Text>
        )}
        {hiddenMessageCountBelow > 0 ? (
          <Button
            data-testid="chat-load-newer-messages"
            onClick={onLoadNewerMessages}
            size="compact-xs"
            variant="subtle"
          >
            Load {Math.min(10, hiddenMessageCountBelow)} newer message
            {hiddenMessageCountBelow > 1 ? 's' : ''}
          </Button>
        ) : null}
        {isLoadingModels ? (
          <Group gap="sm" mt="sm">
            <Loader color="teal" size="sm" />
            <Text size="sm" c="dimmed">
              Loading provider models...
            </Text>
          </Group>
        ) : null}
      </div>
    </Stack>
  );
}

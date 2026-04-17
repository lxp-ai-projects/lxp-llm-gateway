import {
  Alert,
  ActionIcon,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconBrain,
  IconDownload,
  IconMessageCircleBolt,
  IconPencil,
  IconRotateClockwise2,
  IconSend,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { PageHeader } from '../components/page-header';
import { MarkdownText } from '../components/markdown-text';
import { adminApiClient, gatewayApiClient } from '../lib/api-client';
import { scrollChatToBottom, shouldStickToBottom } from '../lib/chat-scroll';
import { shouldFlagMissingAssistantContent } from '../lib/chat-stream';
import {
  appendUserMessage,
  buildGatewayMessages,
  DEFAULT_SYSTEM_PROMPT,
  prepareConversationForAssistantRetry,
  prepareConversationForEditedUserMessage,
} from '../lib/chat-thread';
import { createClientId } from '../lib/id';
import {
  type StoredConversation,
  deleteConversation,
  loadConversations,
  saveConversation,
} from '../lib/chat-store';
import { useRuntimeConfig } from '../lib/use-runtime-config';

function createConversation(model: string, systemPrompt: string): StoredConversation {
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

export function ChatPage() {
  const runtimeConfigQuery = useRuntimeConfig();
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [activePanel, setActivePanel] = useState<'conversation' | 'system-prompt'>('conversation');
  const [conversationPendingDeletion, setConversationPendingDeletion] =
    useState<StoredConversation | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isTransferBusy, setIsTransferBusy] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingAutoScrollFrameRef = useRef<number | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const modelsQuery = useQuery({
    queryKey: ['gateway-models', 'nanogpt'],
    queryFn: () => gatewayApiClient.getModels('nanogpt'),
  });

  useEffect(() => {
    loadConversations()
      .then((storedConversations) => {
        setConversations(storedConversations);
        setActiveConversationId(storedConversations[0]?.id ?? null);
      })
      .catch(() => {
        setConversations([]);
      });
  }, []);

  useEffect(() => {
    if (!model && modelsQuery.data?.models.length) {
      const preferredThinkingModel = modelsQuery.data.models.find((entry) =>
        entry.id.includes('thinking'),
      );
      setModel(preferredThinkingModel?.id ?? modelsQuery.data.models[0]!.id);
    }
  }, [model, modelsQuery.data]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeConversationId) ?? null;
  const persistedSystemPrompt = activeConversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const systemPromptDirty = systemPrompt.trim() !== persistedSystemPrompt.trim();

  function withCurrentSystemPrompt(conversation: StoredConversation): StoredConversation {
    return {
      ...conversation,
      systemPrompt: systemPrompt.trim(),
    };
  }

  useEffect(() => {
    if (activeConversation?.model && activeConversation.model !== model) {
      setModel(activeConversation.model);
    }
  }, [activeConversation?.id, activeConversation?.model, model]);

  useEffect(() => {
    setSystemPrompt(activeConversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT);
  }, [activeConversation?.id, activeConversation?.systemPrompt]);

  useLayoutEffect(() => {
    const container = chatScrollRef.current;
    if (!container || !autoScrollEnabled) {
      return;
    }

    if (pendingAutoScrollFrameRef.current !== null) {
      cancelAnimationFrame(pendingAutoScrollFrameRef.current);
    }

    pendingAutoScrollFrameRef.current = requestAnimationFrame(() => {
      scrollChatToBottom(container);
      pendingAutoScrollFrameRef.current = null;
    });

    return () => {
      if (pendingAutoScrollFrameRef.current !== null) {
        cancelAnimationFrame(pendingAutoScrollFrameRef.current);
        pendingAutoScrollFrameRef.current = null;
      }
    };
  }, [activeConversation?.messages, autoScrollEnabled, isStreaming]);

  async function persistConversationModel(nextModel: string) {
    if (!activeConversation) {
      setModel(nextModel);
      return;
    }

    const updatedConversation: StoredConversation = {
      ...activeConversation,
      model: nextModel,
      updatedAt: new Date().toISOString(),
    };

    setModel(nextModel);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === updatedConversation.id ? updatedConversation : conversation,
      ),
    );
    await saveConversation(updatedConversation);
  }

  async function persistConversationSystemPrompt(nextSystemPrompt: string) {
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
        conversation.id === updatedConversation.id ? updatedConversation : conversation,
      ),
    );
    await saveConversation(updatedConversation);
  }

  async function streamAssistantResponse(baseConversation: StoredConversation): Promise<void> {
    const effectiveModel = baseConversation.model;
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

    setChatError(null);
    setIsStreaming(true);
    setAutoScrollEnabled(true);
    setActiveConversationId(nextConversation.id);
    setEditingMessageId(null);
    setEditingContent('');
    setConversations((current) => {
      const withoutCurrent = current.filter((entry) => entry.id !== nextConversation.id);
      return [nextConversation, ...withoutCurrent];
    });

    try {
      const streamResult = await gatewayApiClient.chatStream(
        {
          providerId: 'nanogpt',
          model: effectiveModel,
          stream: true,
          messages: buildGatewayMessages(baseConversation),
        },
        {
          onChunk: ({ reasoningDelta, contentDelta }) => {
            streamedReasoning += reasoningDelta ?? '';
            streamedContent += contentDelta ?? '';
            setConversations((current) =>
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

      setConversations((current) => [
        persistedConversation,
        ...current.filter((conversation) => conversation.id !== nextConversation.id),
      ]);
      await saveConversation(persistedConversation);

      if (shouldFlagMissingAssistantContent(streamedContent) && !streamedReasoning.trim()) {
        setChatError(
          streamResult.receivedReasoning
            ? 'The model stream ended without any assistant response content.'
            : 'The model stream ended before any assistant output was received.',
        );
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'The gateway stream failed unexpectedly.';
      setChatError(message);
      setConversations((current) => {
        const updatedConversation = current.find((conversation) => conversation.id === nextConversation.id);
        if (!updatedConversation) {
          return current;
        }

        const hasPartialAssistantOutput = Boolean(streamedReasoning.trim() || streamedContent.trim());
        const nextMessages = hasPartialAssistantOutput
          ? updatedConversation.messages
          : updatedConversation.messages.filter((entry) => entry.id !== assistantMessageId);

        const persistedConversation = {
          ...updatedConversation,
          messages: nextMessages,
          updatedAt: new Date().toISOString(),
        };

        void saveConversation(persistedConversation);

        return [
          persistedConversation,
          ...current.filter((conversation) => conversation.id !== nextConversation.id),
        ];
      });
    } finally {
      setIsStreaming(false);
    }
  }

  async function sendMessage(nextPrompt: string): Promise<void> {
    const effectiveModel = activeConversation?.model ?? model;
    const currentConversation =
      activeConversation
        ? withCurrentSystemPrompt(activeConversation)
        : createConversation(effectiveModel, systemPrompt.trim());
    const userMessage = {
      id: createClientId(),
      role: 'user' as const,
      content: nextPrompt,
      createdAt: new Date().toISOString(),
    };

    setPrompt('');
    await streamAssistantResponse(appendUserMessage(currentConversation, userMessage));
  }

  async function resendEditedMessage(messageId: string): Promise<void> {
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
      setChatError(
        error instanceof Error ? error.message : 'The selected user message could not be resent.',
      );
    }
  }

  async function retryAssistantMessage(messageId: string): Promise<void> {
    if (!activeConversation) {
      return;
    }

    try {
      await streamAssistantResponse(
        prepareConversationForAssistantRetry(withCurrentSystemPrompt(activeConversation), messageId),
      );
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : 'The selected assistant response could not be retried.',
      );
    }
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
      setActivePanel('conversation');
      setPrompt('');
      setChatError(null);
      setEditingMessageId(null);
      setEditingContent('');
    }
  }

  async function exportConversation(conversation: StoredConversation): Promise<void> {
    setTransferError(null);
    setIsTransferBusy(true);

    try {
      const exported = await adminApiClient.exportConversation(conversation);
      downloadBlob(exported.blob, exported.fileName ?? `${conversation.title}.json`);
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : 'The conversation export failed unexpectedly.',
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
      const exported = await adminApiClient.exportConversationArchive(conversations);
      downloadBlob(exported.blob, exported.fileName ?? 'lxp-chat-conversations.zip');
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : 'The conversation archive export failed unexpectedly.',
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
      for (const conversation of imported.conversations) {
        await saveConversation(conversation);
      }

      const mergedConversations = mergeConversations(conversations, imported.conversations);
      setConversations(mergedConversations);
      setActiveConversationId(imported.conversations[0]?.id ?? mergedConversations[0]?.id ?? null);
      setActivePanel('conversation');
    } catch (error) {
      setTransferError(
        error instanceof Error ? error.message : 'The conversation import failed unexpectedly.',
      );
    } finally {
      setIsTransferBusy(false);
    }
  }

  return (
    <>
      <input
        ref={importInputRef}
        accept=".json,.zip,application/json,application/zip"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            void importConversationFile(file);
          }
          event.currentTarget.value = '';
        }}
        type="file"
      />
      <Modal
        centered
        opened={conversationPendingDeletion !== null}
        onClose={() => setConversationPendingDeletion(null)}
        title="Delete conversation?"
      >
        <Stack gap="md">
          <Text size="sm">
            This permanently removes the local conversation{' '}
            <Text component="span" fw={700} inherit>
              {conversationPendingDeletion?.title ?? 'Untitled conversation'}
            </Text>
            . The operation cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button onClick={() => setConversationPendingDeletion(null)} variant="subtle">
              Cancel
            </Button>
            <Button color="red" onClick={() => void confirmConversationDeletion()}>
              Delete permanently
            </Button>
          </Group>
        </Stack>
      </Modal>

      <PageHeader
        title="Chat Lab"
        description="A lightweight provider test surface with local IndexedDB persistence and optional reasoning display when thinking models expose it."
      />

      <Grid>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Card className="section-card" h="100%">
            <Group justify="space-between" mb="md">
              <Title order={3}>Local conversations</Title>
              <Group gap="xs">
                <ActionIcon
                  aria-label="Import conversations"
                  disabled={isTransferBusy}
                  onClick={() => importInputRef.current?.click()}
                  variant="light"
                >
                  <IconUpload size={18} />
                </ActionIcon>
                <ActionIcon
                  aria-label="Export all conversations"
                  disabled={!conversations.length || isTransferBusy}
                  onClick={() => void exportAllConversations()}
                  variant="light"
                >
                  <IconDownload size={18} />
                </ActionIcon>
                <ActionIcon
                  aria-label="Create conversation"
                  onClick={() => {
                    const conversation = createConversation(model, systemPrompt.trim());
                    void saveConversation(conversation);
                    setAutoScrollEnabled(true);
                    setConversations((current) => [conversation, ...current]);
                    setActiveConversationId(conversation.id);
                  }}
                  variant="light"
                >
                  <IconMessageCircleBolt size={18} />
                </ActionIcon>
              </Group>
            </Group>
            <Stack gap="sm">
              {transferError ? (
                <Alert color="red" icon={<IconAlertCircle size={18} />} title="Conversation transfer failed">
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
                      justify="space-between"
                      onClick={() => setActiveConversationId(conversation.id)}
                      variant={conversation.id === activeConversationId ? 'filled' : 'light'}
                      style={{ flex: 1 }}
                    >
                      {conversation.title}
                    </Button>
                    <ActionIcon
                      aria-label={`Export ${conversation.title}`}
                      disabled={isTransferBusy}
                      onClick={() => void exportConversation(conversation)}
                      variant="light"
                    >
                      <IconDownload size={16} />
                    </ActionIcon>
                    <ActionIcon
                      aria-label={`Delete ${conversation.title}`}
                      color="red"
                      disabled={isStreaming}
                      onClick={() => setConversationPendingDeletion(conversation)}
                      variant="light"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                ))
              )}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card className="section-card">
            <Group className="chat-toolbar" justify="space-between" align="start" mb="lg">
              <Stack gap={4}>
                <Title order={3}>Provider test surface</Title>
                <Text c="dimmed" size="sm">
                  Runtime gateway status: {runtimeConfigQuery.data?.gatewayOnline ? 'online' : 'offline'}
                </Text>
              </Stack>
              <Select
                data={(modelsQuery.data?.models ?? []).map((entry) => ({
                  value: entry.id,
                  label: entry.displayName,
                }))}
                onChange={(value) => {
                  void persistConversationModel(value ?? 'z-ai/glm-4.6:thinking');
                }}
                value={model}
                className="chat-model-select"
                w={240}
                disabled={modelsQuery.isPending || modelsQuery.isError}
              />
            </Group>

            <Tabs value={activePanel} onChange={(value) => setActivePanel((value as 'conversation' | 'system-prompt') ?? 'conversation')}>
              <Tabs.List mb="md">
                <Tabs.Tab value="conversation">Conversation</Tabs.Tab>
                <Tabs.Tab value="system-prompt">
                  {systemPrompt.trim() !== DEFAULT_SYSTEM_PROMPT ? 'System prompt *' : 'System prompt'}
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="conversation">
                <Stack gap="md">
                  {modelsQuery.isError ? (
                    <Alert color="red" icon={<IconAlertCircle size={18} />} title="Model loading failed">
                      {modelsQuery.error instanceof Error
                        ? modelsQuery.error.message
                        : 'Unable to load provider models.'}
                    </Alert>
                  ) : null}

                  {chatError ? (
                    <Alert color="red" icon={<IconAlertCircle size={18} />} title="Chat request failed">
                      {chatError}
                    </Alert>
                  ) : null}

                  <div
                    ref={chatScrollRef}
                    className="chat-scroll"
                    onScroll={(event) => {
                      const target = event.currentTarget;
                      setAutoScrollEnabled(
                        shouldStickToBottom(target.scrollTop, target.clientHeight, target.scrollHeight),
                      );
                    }}
                  >
                    {activeConversation?.messages.length ? (
                      activeConversation.messages.map((message) => (
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
                              {message.role}
                            </Text>
                            <Group gap={6}>
                              {message.reasoning ? (
                                <ThemeIcon color="brass" radius="xl" size="sm" variant="light">
                                  <IconBrain size={14} />
                                </ThemeIcon>
                              ) : null}
                              {!isStreaming && message.role === 'user' ? (
                                <ActionIcon
                                  aria-label="Edit message"
                                  onClick={() => {
                                    setEditingMessageId(message.id);
                                    setEditingContent(message.content);
                                  }}
                                  size="sm"
                                  variant="subtle"
                                >
                                  <IconPencil size={14} />
                                </ActionIcon>
                              ) : null}
                              {!isStreaming && message.role === 'assistant' ? (
                                <ActionIcon
                                  aria-label="Retry response"
                                  onClick={() => void retryAssistantMessage(message.id)}
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
                                minRows={3}
                                onChange={(event) => setEditingContent(event.currentTarget.value)}
                                value={editingContent}
                              />
                              <Group justify="flex-end">
                                <Button
                                  leftSection={<IconX size={14} />}
                                  onClick={() => {
                                    setEditingMessageId(null);
                                    setEditingContent('');
                                  }}
                                  size="xs"
                                  variant="subtle"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  disabled={!editingContent.trim()}
                                  leftSection={<IconSend size={14} />}
                                  onClick={() => void resendEditedMessage(message.id)}
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
                                <MarkdownText value={message.content} />
                              ) : message.reasoning ? (
                                <Text className="message-text" c="dimmed" fs="italic">
                                  Assistant response was interrupted before content generation completed.
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
                        Start a conversation to verify provider behavior, model output, and optional thinking traces.
                      </Text>
                    )}
                    {isStreaming ? (
                      <Group gap="sm" mt="sm">
                        <Loader color="teal" size="sm" />
                        <Text size="sm" c="dimmed">
                          Streaming provider response...
                        </Text>
                      </Group>
                    ) : null}
                    {modelsQuery.isPending ? (
                      <Group gap="sm" mt="sm">
                        <Loader color="teal" size="sm" />
                        <Text size="sm" c="dimmed">
                          Loading provider models...
                        </Text>
                      </Group>
                    ) : null}
                  </div>

                  <Textarea
                    autosize
                    minRows={4}
                    onChange={(event) => setPrompt(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        const nextPrompt = prompt.trim();
                        if (
                          nextPrompt &&
                          runtimeConfigQuery.data?.gatewayOnline &&
                          model &&
                          !modelsQuery.isPending &&
                          !modelsQuery.isError &&
                          !isStreaming
                        ) {
                          void sendMessage(nextPrompt);
                        }
                      }
                    }}
                    placeholder="Ask the provider something meaningful..."
                    value={prompt}
                  />
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      Selected provider: NanoGPT
                    </Text>
                    <Button
                      disabled={
                        !prompt.trim() ||
                        !runtimeConfigQuery.data?.gatewayOnline ||
                        !model ||
                        modelsQuery.isPending ||
                        modelsQuery.isError ||
                        isStreaming
                      }
                      leftSection={<IconSend size={16} />}
                      loading={isStreaming}
                      onClick={() => void sendMessage(prompt.trim())}
                    >
                      Send
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="system-prompt">
                <Stack gap="md">
                  <Text c="dimmed" size="sm">
                    Use this for test-time steering only. It is persisted per local conversation and prepended as a `system` message before the chat history.
                  </Text>
                  <Textarea
                    autosize
                    label="System prompt"
                    minRows={8}
                    maxRows={18}
                    onChange={(event) => setSystemPrompt(event.currentTarget.value)}
                    placeholder="I am a helpful assistant."
                    value={systemPrompt}
                  />
                  <Group justify="space-between">
                    <Text c="dimmed" size="sm">
                      Default: helpful assistant with application guardrails.
                    </Text>
                    <Group>
                      <Button
                        onClick={() => void persistConversationSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                        variant="light"
                      >
                        Reset to default
                      </Button>
                      <Button
                        disabled={!systemPromptDirty}
                        onClick={() =>
                          void persistConversationSystemPrompt(
                            systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
                          )
                        }
                      >
                        Save prompt
                      </Button>
                    </Group>
                  </Group>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}

function mergeConversations(
  existingConversations: StoredConversation[],
  importedConversations: StoredConversation[],
): StoredConversation[] {
  const merged = new Map(existingConversations.map((conversation) => [conversation.id, conversation]));

  for (const conversation of importedConversations) {
    merged.set(conversation.id, conversation);
  }

  return [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function downloadBlob(blob: Blob, fileName: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}

import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import {
  IconDownload,
} from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { ChatComposer } from '../features/chat/components/chat-composer';
import { ChatMessageList } from '../features/chat/components/chat-message-list';
import { ChatSidebar } from '../features/chat/components/chat-sidebar';
import { ChatSystemPromptPanel } from '../features/chat/components/chat-system-prompt-panel';
import { useChatComposerViewport } from '../features/chat/hooks/use-chat-composer-viewport';
import {
  createConversation,
  downloadBlob,
  mergeConversations,
} from '../features/chat/lib/chat-conversation-utils';
import { PageHeader } from '../components/page-header';
import { adminApiClient, gatewayApiClient } from '../lib/api-client';
import { scrollChatToBottom, shouldStickToBottom } from '../lib/chat-scroll';
import { shouldFlagMissingAssistantContent } from '../lib/chat-stream';
import {
  canLoadNextChatPage,
  canLoadPreviousChatPage,
  CHAT_WINDOW_SCROLL_THRESHOLD_PX,
  createInitialChatWindow,
  loadNextChatPage,
  loadPreviousChatPage,
  syncChatWindow,
  type ChatMessageWindow,
} from '../lib/chat-window';
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
import { useSession } from '../lib/use-session';

export function ChatPage() {
  const runtimeConfigQuery = useRuntimeConfig();
  const sessionQuery = useSession();
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
  const [copiedAssistantMessageId, setCopiedAssistantMessageId] = useState<string | null>(null);
  const [messageWindow, setMessageWindow] = useState<ChatMessageWindow>({ start: 0, end: 0 });
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingAutoScrollFrameRef = useRef<number | null>(null);
  const pendingWindowShiftRef = useRef<null | { scrollHeight: number; scrollTop: number }>(null);
  const copiedMessageTimeoutRef = useRef<number | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const composerViewportStyle = useChatComposerViewport(chatPanelRef, activePanel);
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
  const userDisplayName = sessionQuery.data?.displayName?.trim() || 'User';
  const persistedSystemPrompt = activeConversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const systemPromptDirty = systemPrompt.trim() !== persistedSystemPrompt.trim();
  const renderedMessages = activeConversation
    ? activeConversation.messages.slice(messageWindow.start, messageWindow.end)
    : [];
  const hiddenMessageCountAbove = activeConversation
    ? messageWindow.start
    : 0;
  const hiddenMessageCountBelow = activeConversation
    ? Math.max(0, activeConversation.messages.length - messageWindow.end)
    : 0;

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

  useEffect(() => {
    setMessageWindow(createInitialChatWindow(activeConversation?.messages.length ?? 0));
  }, [activeConversation?.id]);

  useEffect(() => {
    setMessageWindow((current) =>
      syncChatWindow(current, activeConversation?.messages.length ?? 0, {
        followTail: autoScrollEnabled || isStreaming,
      }),
    );
  }, [activeConversation?.messages.length, autoScrollEnabled, isStreaming]);

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

  useLayoutEffect(() => {
    const container = chatScrollRef.current;
    const pendingShift = pendingWindowShiftRef.current;

    if (!container || !pendingShift) {
      return;
    }

    container.scrollTop = pendingShift.scrollTop + (container.scrollHeight - pendingShift.scrollHeight);
    pendingWindowShiftRef.current = null;
  }, [messageWindow.start, messageWindow.end]);

  useEffect(() => {
    return () => {
      if (copiedMessageTimeoutRef.current !== null) {
        window.clearTimeout(copiedMessageTimeoutRef.current);
      }
    };
  }, []);

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

  async function copyAssistantMessage(messageId: string, content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedAssistantMessageId(messageId);

      if (copiedMessageTimeoutRef.current !== null) {
        window.clearTimeout(copiedMessageTimeoutRef.current);
      }

      copiedMessageTimeoutRef.current = window.setTimeout(() => {
        setCopiedAssistantMessageId(null);
        copiedMessageTimeoutRef.current = null;
      }, 1800);
    } catch {
      setChatError('Unable to copy the assistant response from this browser session.');
    }
  }

  function loadEarlierMessages(): void {
    if (!activeConversation || !canLoadPreviousChatPage(messageWindow)) {
      return;
    }

    const target = chatScrollRef.current;
    if (target) {
      setAutoScrollEnabled(false);
      pendingWindowShiftRef.current = {
        scrollHeight: target.scrollHeight,
        scrollTop: target.scrollTop,
      };
    }

    setMessageWindow((current) => loadPreviousChatPage(current, activeConversation.messages.length));
  }

  function loadNewerMessages(): void {
    if (!activeConversation || !canLoadNextChatPage(messageWindow, activeConversation.messages.length)) {
      return;
    }

    const target = chatScrollRef.current;
    if (target) {
      setAutoScrollEnabled(false);
      pendingWindowShiftRef.current = {
        scrollHeight: target.scrollHeight,
        scrollTop: target.scrollTop,
      };
    }

    setMessageWindow((current) => loadNextChatPage(current, activeConversation.messages.length));
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
          <ChatSidebar
            activeConversationId={activeConversationId}
            conversations={conversations}
            isStreaming={isStreaming}
            isTransferBusy={isTransferBusy}
            transferError={transferError}
            onCreateConversation={() => {
              const conversation = createConversation(model, systemPrompt.trim());
              void saveConversation(conversation);
              setAutoScrollEnabled(true);
              setConversations((current) => [conversation, ...current]);
              setActiveConversationId(conversation.id);
            }}
            onDeleteConversation={(conversation) => setConversationPendingDeletion(conversation)}
            onExportAllConversations={() => void exportAllConversations()}
            onExportConversation={(conversation) => void exportConversation(conversation)}
            onImportConversations={() => importInputRef.current?.click()}
            onSelectConversation={setActiveConversationId}
          />
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
                  <div ref={chatPanelRef} className="chat-panel">
                    <ChatMessageList
                      activeConversation={activeConversation}
                      chatError={chatError}
                      copiedAssistantMessageId={copiedAssistantMessageId}
                      editingContent={editingContent}
                      editingMessageId={editingMessageId}
                      hiddenMessageCountAbove={hiddenMessageCountAbove}
                      hiddenMessageCountBelow={hiddenMessageCountBelow}
                      isLoadingModels={modelsQuery.isPending}
                      isStreaming={isStreaming}
                      model={model}
                      modelsErrorMessage={
                        modelsQuery.isError
                          ? modelsQuery.error instanceof Error
                            ? modelsQuery.error.message
                            : 'Unable to load provider models.'
                          : null
                      }
                      onCancelEdit={() => {
                        setEditingMessageId(null);
                        setEditingContent('');
                      }}
                      onCopyAssistantMessage={(messageId, content) =>
                        void copyAssistantMessage(messageId, content)
                      }
                      onEditContentChange={setEditingContent}
                      onEditMessage={(messageId, content) => {
                        setEditingMessageId(messageId);
                        setEditingContent(content);
                      }}
                      onLoadEarlierMessages={loadEarlierMessages}
                      onLoadNewerMessages={loadNewerMessages}
                      onRetryAssistantMessage={(messageId) => void retryAssistantMessage(messageId)}
                      onScroll={(event) => {
                        const target = event.currentTarget;

                        if (
                          activeConversation &&
                          target.scrollTop <= CHAT_WINDOW_SCROLL_THRESHOLD_PX &&
                          canLoadPreviousChatPage(messageWindow)
                        ) {
                          loadEarlierMessages();
                          return;
                        }

                        if (
                          activeConversation &&
                          target.scrollHeight - (target.scrollTop + target.clientHeight) <=
                            CHAT_WINDOW_SCROLL_THRESHOLD_PX &&
                          canLoadNextChatPage(messageWindow, activeConversation.messages.length)
                        ) {
                          loadNewerMessages();
                          return;
                        }

                        setAutoScrollEnabled(
                          shouldStickToBottom(target.scrollTop, target.clientHeight, target.scrollHeight),
                        );
                      }}
                      onSubmitEditedMessage={(messageId) => void resendEditedMessage(messageId)}
                      renderedMessages={renderedMessages}
                      scrollRef={chatScrollRef}
                      userDisplayName={userDisplayName}
                    />

                    <ChatComposer
                      composerViewportStyle={composerViewportStyle}
                      disabled={
                        !prompt.trim() ||
                        !runtimeConfigQuery.data?.gatewayOnline ||
                        !model ||
                        modelsQuery.isPending ||
                        modelsQuery.isError ||
                        isStreaming
                      }
                      isStreaming={isStreaming}
                      onPromptChange={setPrompt}
                      onPromptSubmit={() => {
                        const nextPrompt = prompt.trim();
                        if (!nextPrompt) {
                          return;
                        }

                        void sendMessage(nextPrompt);
                      }}
                      prompt={prompt}
                    />
                  </div>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="system-prompt">
                <ChatSystemPromptPanel
                  isDirty={systemPromptDirty}
                  onChange={setSystemPrompt}
                  onReset={() => void persistConversationSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
                  onSave={() =>
                    void persistConversationSystemPrompt(
                      systemPrompt.trim() || DEFAULT_SYSTEM_PROMPT,
                    )
                  }
                  systemPrompt={systemPrompt}
                />
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}

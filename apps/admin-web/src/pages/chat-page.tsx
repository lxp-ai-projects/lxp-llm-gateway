import {Alert, Button, Card, Grid, Group, Modal, Select, Stack, Tabs, Text, Title,} from '@mantine/core';
import {useQuery} from '@tanstack/react-query';
import {useEffect, useMemo, useRef, useState} from 'react';

import {ChatComposer} from '../features/chat/components/chat-composer';
import {ChatMessageList} from '../features/chat/components/chat-message-list';
import {ChatSidebar} from '../features/chat/components/chat-sidebar';
import {ChatSystemPromptPanel} from '../features/chat/components/chat-system-prompt-panel';
import {useChatClipboard} from '../features/chat/hooks/use-chat-clipboard';
import {useChatConversations} from '../features/chat/hooks/use-chat-conversations';
import {useChatComposerViewport} from '../features/chat/hooks/use-chat-composer-viewport';
import {useChatMessageWindow} from '../features/chat/hooks/use-chat-message-window';
import {useChatStreaming} from '../features/chat/hooks/use-chat-streaming';
import {useChatTransfer} from '../features/chat/hooks/use-chat-transfer';
import {createConversation} from '../features/chat/lib/chat-conversation-utils';
import {PageHeader} from '../components/page-header';
import {adminApiClient, gatewayApiClient} from '../lib/api-client';
import {DEFAULT_SYSTEM_PROMPT} from '../lib/chat-thread';
import {type StoredConversation} from '../lib/chat-store';
import {useRuntimeConfig} from '../lib/use-runtime-config';
import {useSession} from '../lib/use-session';
import {
  buildDefaultModelOptions,
  buildProviderOptions,
  getProviderCatalogPricingNote,
} from '../features/providers/lib/provider-utils';

export function ChatPage() {
  const runtimeConfigQuery = useRuntimeConfig();
  const sessionQuery = useSession();
  const conversationScope = useMemo(
    () => ({
      userUuid: sessionQuery.data?.userUuid ?? 'anonymous',
      tenantId: sessionQuery.data?.activeTenantId ?? 'unknown-tenant',
    }),
    [sessionQuery.data?.activeTenantId, sessionQuery.data?.userUuid],
  );
  const [prompt, setPrompt] = useState('');
  const [providerId, setProviderId] = useState('');
  const [model, setModel] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [streamingSignal, setStreamingSignal] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [activePanel, setActivePanel] = useState<
    'conversation' | 'system-prompt'
  >('conversation');
  const pendingConversationProviderSyncRef = useRef(false);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const composerViewportStyle = useChatComposerViewport(
    chatPanelRef,
    activePanel,
  );
  const providerSettingsQuery = useQuery({
    queryKey: ['own-provider-settings'],
    queryFn: () => adminApiClient.getOwnProviderSettings(),
  });
  const supportedProviders = runtimeConfigQuery.data?.supportedProviders ?? [];
  const providerOptions = buildProviderOptions(supportedProviders);
  const { copiedAssistantMessageId, copyAssistantMessage } =
    useChatClipboard(setChatError);
  const {
    activeConversation,
    activeConversationId,
    confirmConversationDeletion,
    conversationPendingDeletion,
    conversations,
    createConversation: createStoredConversation,
    persistConversationProvider,
    persistConversationSystemPrompt,
    setActiveConversationId,
    setConversationPendingDeletion,
    setConversations,
    setSystemPrompt,
    systemPrompt,
  } = useChatConversations({
    providerId,
    model,
    scope: conversationScope,
    onResetComposerState: () => {
      setPrompt('');
      setEditingMessageId(null);
      setEditingContent('');
    },
    onSetActivePanel: setActivePanel,
    onSetChatError: setChatError,
  });
  const {
    exportAllConversations,
    exportConversation,
    importConversationFile,
    isTransferBusy,
    transferError,
  } = useChatTransfer({
    conversations,
    scope: conversationScope,
    setActiveConversationId,
    setActivePanel,
    setConversations,
  });
  const {
    chatScrollRef,
    handleScroll,
    hiddenMessageCountAbove,
    hiddenMessageCountBelow,
    loadEarlierMessages,
    loadNewerMessages,
    renderedMessages,
    setAutoScrollEnabled,
  } = useChatMessageWindow({
    activeConversation,
    isStreaming: streamingSignal,
  });
  const {
    isStreaming,
    resendEditedMessage,
    retryAssistantMessage,
    sendMessage,
  } = useChatStreaming({
    activeConversation,
    editingContent,
    onClearEditingState: () => {
      setEditingMessageId(null);
      setEditingContent('');
    },
    onConversationActivated: setActiveConversationId,
    onConversationUpdated: setConversations,
    onPromptCleared: () => setPrompt(''),
    onSetAutoScrollEnabled: setAutoScrollEnabled,
    onSetChatError: setChatError,
    onStreamingChange: setStreamingSignal,
  });
  const modelsQuery = useQuery({
    queryKey: ['gateway-models', providerId],
    queryFn: () => gatewayApiClient.getModels(providerId || undefined),
    enabled: Boolean(providerId),
  });
  const sortedModelOptions = buildDefaultModelOptions(
    modelsQuery.data?.models ?? [],
  );

  useEffect(() => {
    if (providerId) {
      return;
    }

    const preferredProviderId =
      activeConversation?.providerId ??
      providerSettingsQuery.data?.defaultProviderId ??
      providerOptions.find((option) => option.value === 'nanogpt')?.value ??
      providerOptions[0]?.value ??
      'nanogpt';
    setProviderId(preferredProviderId);
  }, [
    activeConversation?.providerId,
    providerId,
    providerOptions,
    providerSettingsQuery.data?.defaultProviderId,
  ]);

  useEffect(() => {
    if (!activeConversation) {
      pendingConversationProviderSyncRef.current = false;
      return;
    }

    setProviderId((currentProviderId) =>
      currentProviderId === activeConversation.providerId
        ? currentProviderId
        : activeConversation.providerId,
    );
    setModel((currentModel) =>
      currentModel === activeConversation.model
        ? currentModel
        : activeConversation.model,
    );
    pendingConversationProviderSyncRef.current = false;
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!providerId || !modelsQuery.data?.models.length) {
      return;
    }

    const availableModels = modelsQuery.data.models;
    const configuredDefaultModel =
      providerSettingsQuery.data?.defaultProviderId === providerId
        ? providerSettingsQuery.data.defaultModel
        : null;
    const preferredThinkingModel = availableModels.find((entry) =>
      entry.id.includes('thinking'),
    );
    const nextModelCandidate =
      configuredDefaultModel ??
      preferredThinkingModel?.id ??
      availableModels[0]!.id;
    const modelExists = model
      ? availableModels.some((entry) => entry.id === model)
      : false;
    const nextModel = modelExists ? model : nextModelCandidate;

    if (nextModel === model) {
      return;
    }

    setModel(nextModel);

    if (
      pendingConversationProviderSyncRef.current &&
      activeConversation &&
      nextModel
    ) {
      pendingConversationProviderSyncRef.current = false;
      void persistConversationProvider(providerId, nextModel);
    }
  }, [
    activeConversation,
    model,
    modelsQuery.data,
    persistConversationProvider,
    providerId,
    providerSettingsQuery.data?.defaultModel,
    providerSettingsQuery.data?.defaultProviderId,
  ]);

  const userDisplayName = sessionQuery.data?.displayName?.trim() || 'User';
  const persistedSystemPrompt =
    activeConversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const systemPromptDirty =
    systemPrompt.trim() !== persistedSystemPrompt.trim();

  function withCurrentSelection(
    conversation: StoredConversation,
  ): StoredConversation {
    return {
      ...conversation,
      providerId,
      model,
      systemPrompt: systemPrompt.trim(),
    };
  }

  const providerCatalogPricingNote = getProviderCatalogPricingNote(providerId);
  const selectedProviderDisplayName =
    providerOptions.find((option) => option.value === providerId)?.label ??
    providerId;

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
        data-testid="chat-delete-conversation-modal"
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
            <Button
              data-testid="chat-delete-conversation-cancel"
              onClick={() => setConversationPendingDeletion(null)}
              variant="subtle"
            >
              Cancel
            </Button>
            <Button
              color="red"
              data-testid="chat-delete-conversation-confirm"
              onClick={() => void confirmConversationDeletion()}
            >
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
              setAutoScrollEnabled(true);
              void createStoredConversation();
            }}
            onDeleteConversation={(conversation) =>
              setConversationPendingDeletion(conversation)
            }
            onExportAllConversations={() => void exportAllConversations()}
            onExportConversation={(conversation) =>
              void exportConversation(conversation)
            }
            onImportConversations={() => importInputRef.current?.click()}
            onSelectConversation={setActiveConversationId}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Card className="section-card">
            <Group
              className="chat-toolbar"
              justify="space-between"
              align="start"
              mb="lg"
            >
              <Stack gap={4}>
                <Title order={3}>Provider test surface</Title>
                <Text c="dimmed" size="sm">
                  Runtime gateway status:{' '}
                  {runtimeConfigQuery.data?.gatewayOnline
                    ? 'online'
                    : 'offline'}
                </Text>
              </Stack>
              <Stack gap="xs" w={240}>
                <Select
                  data={providerOptions}
                  data-testid="chat-provider-select"
                  label="Provider"
                  onChange={(value) => {
                    const nextProviderId =
                      value ?? providerOptions[0]?.value ?? 'nanogpt';
                    pendingConversationProviderSyncRef.current =
                      Boolean(activeConversation);
                    setProviderId(nextProviderId);
                    setModel('');
                  }}
                  value={providerId}
                />
                <Select
                  data={sortedModelOptions}
                  data-testid="chat-model-select"
                  label="Model"
                  onChange={(value) => {
                    const nextModel = value ?? '';
                    pendingConversationProviderSyncRef.current = false;
                    setModel(nextModel);
                    if (activeConversation && nextModel) {
                      void persistConversationProvider(providerId, nextModel);
                    }
                  }}
                  value={model}
                  className="chat-model-select"
                  disabled={!providerId || modelsQuery.isPending || modelsQuery.isError}
                />
              </Stack>
            </Group>
            {providerCatalogPricingNote ? (
              <Alert color="blue" mb="md" title="Model catalog note">
                {providerCatalogPricingNote}
              </Alert>
            ) : null}

            <Tabs
              value={activePanel}
              onChange={(value) =>
                setActivePanel(
                  (value as 'conversation' | 'system-prompt') ?? 'conversation',
                )
              }
            >
              <Tabs.List mb="md">
                <Tabs.Tab
                  data-testid="chat-tab-conversation"
                  value="conversation"
                >
                  Conversation
                </Tabs.Tab>
                <Tabs.Tab
                  data-testid="chat-tab-system-prompt"
                  value="system-prompt"
                >
                  {systemPrompt.trim() !== DEFAULT_SYSTEM_PROMPT
                    ? 'System prompt *'
                    : 'System prompt'}
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
                      providerId={providerId}
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
                      onRetryAssistantMessage={(messageId) =>
                        void retryAssistantMessage(
                          withCurrentSelection,
                          messageId,
                        )
                      }
                      onScroll={handleScroll}
                      onSubmitEditedMessage={(messageId) =>
                        void resendEditedMessage(
                          withCurrentSelection,
                          messageId,
                        )
                      }
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

                        void sendMessage(() => {
                          return activeConversation
                            ? withCurrentSelection(activeConversation)
                            : createConversation(
                                conversationScope,
                                providerId,
                                model,
                                systemPrompt.trim(),
                              );
                        }, nextPrompt);
                      }}
                      prompt={prompt}
                      providerDisplayName={selectedProviderDisplayName}
                    />
                  </div>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="system-prompt">
                <ChatSystemPromptPanel
                  isDirty={systemPromptDirty}
                  onChange={setSystemPrompt}
                  onReset={() =>
                    void persistConversationSystemPrompt(DEFAULT_SYSTEM_PROMPT)
                  }
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

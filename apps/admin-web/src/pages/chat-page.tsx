import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import {
  getThinkingTransportCompatibility,
  supportsPreservedThinking,
} from '@lxp/domain';

import { ChatComposer } from '../features/chat/components/chat-composer';
import { ChatMessageList } from '../features/chat/components/chat-message-list';
import { ChatSidebar } from '../features/chat/components/chat-sidebar';
import { ChatSystemPromptPanel } from '../features/chat/components/chat-system-prompt-panel';
import { useChatClipboard } from '../features/chat/hooks/use-chat-clipboard';
import { useChatConversations } from '../features/chat/hooks/use-chat-conversations';
import { useChatComposerViewport } from '../features/chat/hooks/use-chat-composer-viewport';
import { useChatMessageWindow } from '../features/chat/hooks/use-chat-message-window';
import { useChatStreaming } from '../features/chat/hooks/use-chat-streaming';
import { useChatTransfer } from '../features/chat/hooks/use-chat-transfer';
import { createConversation } from '../features/chat/lib/chat-conversation-utils';
import { PageHeader } from '../components/page-header';
import { adminApiClient, gatewayApiClient } from '../lib/api-client';
import { DEFAULT_SYSTEM_PROMPT } from '../lib/chat-thread';
import { type StoredConversation } from '../lib/chat-store';
import type {
  GatewayChatProviderOptions,
  GatewayReasoningEffort,
  ProviderModelSummary,
} from '../lib/api-client.types';
import { useRuntimeConfig } from '../lib/use-runtime-config';
import { useSession } from '../lib/use-session';
import {
  buildDefaultModelOptions,
  buildProviderOptions,
  getProviderCatalogPricingNote,
} from '../features/providers/lib/provider-utils';

type AnthropicExtendedThinkingUiMode = 'none' | 'auto' | 'budget';
type ThinkingUiMode = 'enabled' | 'enabled-preserve' | 'disabled';
type ReasoningEffortUiMode = GatewayReasoningEffort | 'provider-default';
type ReasoningControl = 'adaptive' | 'budget' | 'effort' | 'toggle';

function buildAnthropicProviderOptions(
  providerId: string,
  mode: AnthropicExtendedThinkingUiMode,
  budgetTokens: number | '',
): GatewayChatProviderOptions | undefined {
  if (providerId !== 'anthropic') {
    return undefined;
  }

  if (mode === 'none') {
    return {
      anthropic: {
        extendedThinking: {
          mode: 'disabled',
        },
      },
    };
  }

  if (mode === 'auto') {
    return {
      anthropic: {
        extendedThinking: {
          mode: 'adaptive',
        },
      },
    };
  }

  if (typeof budgetTokens !== 'number' || !Number.isInteger(budgetTokens)) {
    return {
      anthropic: {
        extendedThinking: {
          mode: 'disabled',
        },
      },
    };
  }

  return {
    anthropic: {
      extendedThinking: {
        mode: 'budget',
        budgetTokens,
      },
    },
  };
}

function readAnthropicThinkingSelection(
  conversation: StoredConversation | null,
): {
  mode: AnthropicExtendedThinkingUiMode;
  budgetTokens: number;
} {
  const extendedThinking =
    conversation?.providerOptions?.anthropic?.extendedThinking;

  if (!extendedThinking) {
    return {
      mode: 'none',
      budgetTokens: 4096,
    };
  }

  if (extendedThinking.mode === 'adaptive') {
    return {
      mode: 'auto',
      budgetTokens: 4096,
    };
  }

  if (extendedThinking.mode === 'budget') {
    return {
      mode: 'budget',
      budgetTokens: extendedThinking.budgetTokens ?? 4096,
    };
  }

  return {
    mode: 'none',
    budgetTokens: 4096,
  };
}

function buildThinkingProviderOptions(
  providerId: string,
  modelId: string,
  mode: ThinkingUiMode,
): GatewayChatProviderOptions | undefined {
  if (providerId === 'nanogpt') {
    if (
      getThinkingTransportCompatibility(providerId, modelId)?.requestMapping ===
      'nanogpt-zai-thinking'
    ) {
      return {
        zai: {
          thinking: {
            type: mode === 'disabled' ? 'disabled' : 'enabled',
            clearThinking: mode !== 'enabled-preserve',
          },
        },
      };
    }

    return {
      nanogpt: {
        reasoning: {
          effort: mode === 'disabled' ? 'none' : 'medium',
        },
      },
    };
  }

  if (providerId === 'zai') {
    if (mode === 'disabled') {
      return {
        zai: {
          thinking: {
            type: 'disabled',
            clearThinking: true,
          },
        },
      };
    }

    return {
      zai: {
        thinking: {
          type: 'enabled',
          clearThinking: mode === 'enabled',
        },
      },
    };
  }

  if (providerId === 'openrouter') {
    return {
      openrouter: {
        reasoning:
          mode === 'disabled'
            ? {
                enabled: false,
                exclude: true,
              }
            : {
                enabled: true,
              },
      },
    };
  }

  if (providerId === 'ollama') {
    return {
      ollama: {
        thinking: {
          enabled: mode !== 'disabled',
        },
      },
    };
  }

  return undefined;
}

function readThinkingSelection(
  providerId: string,
  conversation: StoredConversation | null,
): ThinkingUiMode {
  if (providerId === 'nanogpt') {
    const nanoGptReasoning = conversation?.providerOptions?.nanogpt?.reasoning;
    if (nanoGptReasoning) {
      return nanoGptReasoning.effort === 'none' ? 'disabled' : 'enabled';
    }

    const thinking = conversation?.providerOptions?.zai?.thinking;
    if (!thinking || thinking.type === 'enabled') {
      return thinking?.clearThinking === false ? 'enabled-preserve' : 'enabled';
    }

    return 'disabled';
  }

  if (providerId === 'zai') {
    const thinking = conversation?.providerOptions?.zai?.thinking;
    if (!thinking || thinking.type === 'enabled') {
      return thinking?.clearThinking === false ? 'enabled-preserve' : 'enabled';
    }

    return 'disabled';
  }

  if (providerId === 'openrouter') {
    return conversation?.providerOptions?.openrouter?.reasoning?.enabled ===
      false
      ? 'disabled'
      : 'enabled';
  }

  if (providerId === 'ollama') {
    return conversation?.providerOptions?.ollama?.thinking?.enabled === false
      ? 'disabled'
      : 'enabled';
  }

  return 'enabled';
}

function buildReasoningEffortProviderOptions(
  providerId: string,
  effort: ReasoningEffortUiMode,
): GatewayChatProviderOptions | undefined {
  if (effort === 'provider-default') {
    return undefined;
  }

  if (providerId === 'openrouter') {
    return { openrouter: { reasoning: { effort } } };
  }

  if (providerId === 'nanogpt') {
    return { nanogpt: { reasoning: { effort } } };
  }

  if (providerId === 'openai' || providerId === 'xai') {
    return { [providerId]: { reasoning: { effort } } };
  }

  return undefined;
}

function readReasoningEffortSelection(
  providerId: string,
  conversation: StoredConversation | null,
): ReasoningEffortUiMode {
  if (providerId === 'openrouter') {
    return (
      conversation?.providerOptions?.openrouter?.reasoning?.effort ??
      'provider-default'
    );
  }

  if (providerId === 'nanogpt') {
    return (
      conversation?.providerOptions?.nanogpt?.reasoning?.effort ??
      'provider-default'
    );
  }

  if (providerId === 'openai' || providerId === 'xai') {
    return (
      conversation?.providerOptions?.[providerId]?.reasoning?.effort ??
      'provider-default'
    );
  }

  return 'provider-default';
}

function getModelReasoningCapability(
  models: ProviderModelSummary[] | undefined,
  modelId: string,
) {
  return models?.find((entry) => entry.id === modelId)?.capabilities?.reasoning;
}

function buildChatProviderOptions(input: {
  providerId: string;
  model: string;
  anthropicThinkingMode: AnthropicExtendedThinkingUiMode;
  anthropicThinkingBudgetTokens: number | '';
  thinkingMode: ThinkingUiMode;
  reasoningSupported: boolean;
  reasoningMandatory: boolean;
  reasoningControls: ReasoningControl[];
  reasoningEffort: ReasoningEffortUiMode;
}): GatewayChatProviderOptions | undefined {
  if (!input.reasoningSupported) {
    return undefined;
  }

  const effortOptions = input.reasoningControls.includes('effort')
    ? buildReasoningEffortProviderOptions(
        input.providerId,
        input.reasoningEffort,
      )
    : undefined;
  if (effortOptions) {
    return effortOptions;
  }

  if (input.reasoningMandatory) {
    return undefined;
  }

  return (
    buildAnthropicProviderOptions(
      input.providerId,
      input.anthropicThinkingMode,
      input.anthropicThinkingBudgetTokens,
    ) ??
    (input.reasoningControls.includes('toggle')
      ? buildThinkingProviderOptions(
          input.providerId,
          input.model,
          input.thinkingMode,
        )
      : undefined)
  );
}

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
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | ''>('');
  const [anthropicThinkingMode, setAnthropicThinkingMode] =
    useState<AnthropicExtendedThinkingUiMode>('none');
  const [anthropicThinkingBudgetTokens, setAnthropicThinkingBudgetTokens] =
    useState<number | ''>(4096);
  const [thinkingMode, setThinkingMode] = useState<ThinkingUiMode>('enabled');
  const [reasoningEffort, setReasoningEffort] =
    useState<ReasoningEffortUiMode>('provider-default');
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatWarning, setChatWarning] = useState<string | null>(null);
  const [streamingSignal, setStreamingSignal] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [activePanel, setActivePanel] = useState<
    'conversation' | 'system-prompt'
  >('conversation');
  const pendingConversationProviderSyncRef = useRef(false);
  const forcedThinkingDisabledRef = useRef(false);
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
    persistConversationMaxOutputTokens,
    persistConversationModel,
    persistConversationProvider,
    persistConversationProviderOptions,
    persistConversationSystemPrompt,
    setActiveConversationId,
    setConversationPendingDeletion,
    setConversations,
    setSystemPrompt,
    systemPrompt,
  } = useChatConversations({
    providerId,
    model,
    maxOutputTokens:
      typeof maxOutputTokens === 'number' ? maxOutputTokens : undefined,
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
    onSetChatWarning: setChatWarning,
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
    const selection = readAnthropicThinkingSelection(activeConversation);
    setAnthropicThinkingMode(selection.mode);
    setAnthropicThinkingBudgetTokens(selection.budgetTokens);
  }, [activeConversation?.id, activeConversation?.providerOptions]);

  useEffect(() => {
    setThinkingMode(readThinkingSelection(providerId, activeConversation));
    setReasoningEffort(
      readReasoningEffortSelection(providerId, activeConversation),
    );
    forcedThinkingDisabledRef.current = false;
  }, [activeConversation?.id, activeConversation?.providerOptions, providerId]);

  useEffect(() => {
    setMaxOutputTokens(activeConversation?.maxOutputTokens ?? '');
  }, [activeConversation?.id, activeConversation?.maxOutputTokens]);

  const userDisplayName = sessionQuery.data?.displayName?.trim() || 'User';
  const persistedSystemPrompt =
    activeConversation?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  const systemPromptDirty =
    systemPrompt.trim() !== persistedSystemPrompt.trim();
  const normalizedMaxOutputTokens =
    typeof maxOutputTokens === 'number' && Number.isInteger(maxOutputTokens)
      ? maxOutputTokens
      : undefined;
  const selectedModel = modelsQuery.data?.models.find(
    (entry) => entry.id === model,
  );
  const reasoningCapability = selectedModel?.capabilities?.reasoning;
  const anthropicThinkingDisabledForModel =
    providerId === 'anthropic' &&
    model.length > 0 &&
    reasoningCapability?.supported !== true;
  const effectiveAnthropicThinkingMode = anthropicThinkingDisabledForModel
    ? 'none'
    : anthropicThinkingMode;
  const thinkingControlVisible =
    providerId !== 'anthropic' &&
    reasoningCapability?.supported === true &&
    reasoningCapability.mandatory !== true &&
    reasoningCapability.controls.includes('toggle') &&
    (providerId === 'zai' ||
      providerId === 'nanogpt' ||
      providerId === 'openrouter' ||
      providerId === 'ollama');
  const reasoningEffortControlVisible =
    reasoningCapability?.supported === true &&
    reasoningCapability.controls.includes('effort') &&
    Boolean(reasoningCapability.supportedEfforts?.length) &&
    (providerId === 'nanogpt' ||
      providerId === 'openrouter' ||
      providerId === 'openai' ||
      providerId === 'xai');
  const thinkingSupported =
    thinkingControlVisible &&
    model.length > 0 &&
    reasoningCapability?.supported === true;
  const preserveThinkingSupported =
    thinkingControlVisible &&
    model.length > 0 &&
    supportsPreservedThinking(providerId, model);
  const effectiveThinkingMode = reasoningCapability?.mandatory
    ? 'enabled'
    : thinkingControlVisible && model.length > 0 && !thinkingSupported
      ? 'disabled'
      : preserveThinkingSupported || thinkingMode !== 'enabled-preserve'
        ? thinkingMode
        : 'enabled';
  const effectiveReasoningEffort =
    reasoningEffort !== 'provider-default' &&
    reasoningCapability?.supportedEfforts?.includes(reasoningEffort)
      ? reasoningEffort
      : 'provider-default';
  const chatProviderOptions = buildChatProviderOptions({
    providerId,
    model,
    anthropicThinkingMode: effectiveAnthropicThinkingMode,
    anthropicThinkingBudgetTokens,
    thinkingMode: effectiveThinkingMode,
    reasoningSupported: reasoningCapability?.supported === true,
    reasoningMandatory: reasoningCapability?.mandatory === true,
    reasoningControls: reasoningCapability?.controls ?? [],
    reasoningEffort: effectiveReasoningEffort,
  });
  const preserveThinkingEnabled = effectiveThinkingMode === 'enabled-preserve';
  const providerCatalogPricingNote = getProviderCatalogPricingNote(providerId);
  const selectedProviderDisplayName =
    providerOptions.find((option) => option.value === providerId)?.label ??
    providerId;
  const selectedModelDisplayName =
    sortedModelOptions.find((option) => option.value === model)?.label ?? model;
  const anthropicAdaptiveThinkingSupported =
    providerId === 'anthropic' &&
    reasoningCapability?.controls.includes('adaptive') === true;
  const persistConversationProviderFromEffect = useEffectEvent(
    (nextProviderId: string, nextModel: string) => {
      if (!activeConversation) {
        return;
      }

      const nextReasoningCapability = getModelReasoningCapability(
        modelsQuery.data?.models,
        nextModel,
      );
      void persistConversationProvider(
        nextProviderId,
        nextModel,
        buildChatProviderOptions({
          providerId: nextProviderId,
          model: nextModel,
          anthropicThinkingMode,
          anthropicThinkingBudgetTokens,
          thinkingMode,
          reasoningSupported: nextReasoningCapability?.supported === true,
          reasoningMandatory: nextReasoningCapability?.mandatory === true,
          reasoningControls: nextReasoningCapability?.controls ?? [],
          reasoningEffort,
        }),
      );
    },
  );
  const persistConversationProviderOptionsFromEffect = useEffectEvent(
    (nextProviderOptions?: GatewayChatProviderOptions) => {
      if (!activeConversation) {
        return;
      }

      void persistConversationProviderOptions(nextProviderOptions);
    },
  );

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
      persistConversationProviderFromEffect(providerId, nextModel);
    }
  }, [
    activeConversation,
    model,
    modelsQuery.data,
    providerId,
    providerSettingsQuery.data?.defaultModel,
    providerSettingsQuery.data?.defaultProviderId,
  ]);

  useEffect(() => {
    if (!thinkingControlVisible || !model || thinkingSupported) {
      return;
    }

    if (thinkingMode === 'disabled') {
      return;
    }

    forcedThinkingDisabledRef.current = true;
    setThinkingMode('disabled');
    if (activeConversation) {
      persistConversationProviderOptionsFromEffect(
        buildThinkingProviderOptions(providerId, model, 'disabled'),
      );
    }
  }, [
    activeConversation,
    model,
    providerId,
    thinkingControlVisible,
    thinkingMode,
    thinkingSupported,
  ]);

  useEffect(() => {
    if (
      !thinkingControlVisible ||
      !model ||
      !thinkingSupported ||
      thinkingMode !== 'disabled' ||
      !forcedThinkingDisabledRef.current
    ) {
      return;
    }

    forcedThinkingDisabledRef.current = false;
    setThinkingMode('enabled');
    if (activeConversation) {
      persistConversationProviderOptionsFromEffect(
        buildThinkingProviderOptions(providerId, model, 'enabled'),
      );
    }
  }, [
    activeConversation,
    model,
    providerId,
    thinkingControlVisible,
    thinkingMode,
    thinkingSupported,
  ]);

  useEffect(() => {
    if (!thinkingControlVisible || !model || preserveThinkingSupported) {
      return;
    }

    if (thinkingMode !== 'enabled-preserve') {
      return;
    }

    setThinkingMode('enabled');
    if (activeConversation) {
      persistConversationProviderOptionsFromEffect(
        buildThinkingProviderOptions(providerId, model, 'enabled'),
      );
    }
  }, [
    activeConversation,
    model,
    preserveThinkingSupported,
    providerId,
    thinkingControlVisible,
    thinkingMode,
  ]);

  function withCurrentSelection(
    conversation: StoredConversation,
  ): StoredConversation {
    return {
      ...conversation,
      providerId,
      model,
      maxOutputTokens: normalizedMaxOutputTokens,
      providerOptions: buildChatProviderOptions({
        providerId,
        model,
        anthropicThinkingMode: effectiveAnthropicThinkingMode,
        anthropicThinkingBudgetTokens,
        thinkingMode: effectiveThinkingMode,
        reasoningSupported: reasoningCapability?.supported === true,
        reasoningMandatory: reasoningCapability?.mandatory === true,
        reasoningControls: reasoningCapability?.controls ?? [],
        reasoningEffort: effectiveReasoningEffort,
      }),
      systemPrompt: systemPrompt.trim(),
    };
  }

  useEffect(() => {
    if (
      !anthropicThinkingDisabledForModel ||
      anthropicThinkingMode === 'none'
    ) {
      return;
    }

    setAnthropicThinkingMode('none');
    if (activeConversation) {
      persistConversationProviderOptionsFromEffect(
        buildAnthropicProviderOptions(
          providerId,
          'none',
          anthropicThinkingBudgetTokens,
        ),
      );
    }
  }, [
    activeConversation,
    anthropicThinkingBudgetTokens,
    anthropicThinkingDisabledForModel,
    providerId,
    anthropicThinkingMode,
  ]);

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
              void createStoredConversation(chatProviderOptions);
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
                    const defaultThinkingSelection =
                      nextProviderId === 'anthropic'
                        ? readAnthropicThinkingSelection(activeConversation)
                        : { mode: 'none' as const, budgetTokens: 4096 };
                    const defaultProviderThinkingSelection =
                      readThinkingSelection(nextProviderId, activeConversation);
                    const defaultProviderEffortSelection =
                      readReasoningEffortSelection(
                        nextProviderId,
                        activeConversation,
                      );
                    pendingConversationProviderSyncRef.current =
                      Boolean(activeConversation);
                    setProviderId(nextProviderId);
                    setAnthropicThinkingMode(defaultThinkingSelection.mode);
                    setAnthropicThinkingBudgetTokens(
                      defaultThinkingSelection.budgetTokens,
                    );
                    setThinkingMode(defaultProviderThinkingSelection);
                    setReasoningEffort(defaultProviderEffortSelection);
                    setModel('');
                  }}
                  value={providerId}
                />
                <Select
                  data={sortedModelOptions}
                  data-testid="chat-model-select"
                  label="Model"
                  limit={100}
                  nothingFoundMessage="No models found"
                  onChange={(value) => {
                    const nextModel = value ?? '';
                    pendingConversationProviderSyncRef.current = false;
                    setModel(nextModel);
                    if (activeConversation && nextModel) {
                      const nextReasoningCapability =
                        getModelReasoningCapability(
                          modelsQuery.data?.models,
                          nextModel,
                        );
                      const nextChatProviderOptions = buildChatProviderOptions({
                        providerId,
                        model: nextModel,
                        anthropicThinkingMode: effectiveAnthropicThinkingMode,
                        anthropicThinkingBudgetTokens,
                        thinkingMode: effectiveThinkingMode,
                        reasoningSupported:
                          nextReasoningCapability?.supported === true,
                        reasoningMandatory:
                          nextReasoningCapability?.mandatory === true,
                        reasoningControls:
                          nextReasoningCapability?.controls ?? [],
                        reasoningEffort,
                      });
                      void persistConversationModel(
                        nextModel,
                        nextChatProviderOptions,
                      );
                    }
                  }}
                  searchable
                  selectFirstOptionOnChange
                  value={model}
                  className="chat-model-select"
                  disabled={
                    !providerId || modelsQuery.isPending || modelsQuery.isError
                  }
                />
                <NumberInput
                  data-testid="chat-max-output-tokens-input"
                  label="Max output tokens"
                  min={1}
                  onChange={(value) => {
                    const nextMaxOutputTokens =
                      typeof value === 'number' ? value : '';
                    setMaxOutputTokens(nextMaxOutputTokens);
                    if (activeConversation) {
                      void persistConversationMaxOutputTokens(
                        typeof nextMaxOutputTokens === 'number'
                          ? nextMaxOutputTokens
                          : undefined,
                      );
                    }
                  }}
                  placeholder="Provider default"
                  value={maxOutputTokens}
                />
                {providerId === 'anthropic' ? (
                  <>
                    <Select
                      data={[
                        { value: 'none', label: 'Extended thinking: none' },
                        ...(reasoningCapability?.controls.includes('adaptive')
                          ? [
                              {
                                value: 'auto',
                                label: 'Extended thinking: auto',
                              },
                            ]
                          : []),
                        ...(reasoningCapability?.controls.includes('budget')
                          ? [
                              {
                                value: 'budget',
                                label: 'Extended thinking: budget',
                              },
                            ]
                          : []),
                      ]}
                      data-testid="chat-anthropic-thinking-mode-select"
                      disabled={anthropicThinkingDisabledForModel}
                      label="Thinking"
                      onChange={(value) => {
                        const nextMode =
                          (value as AnthropicExtendedThinkingUiMode | null) ??
                          'none';
                        setAnthropicThinkingMode(nextMode);
                        const nextProviderOptions =
                          buildAnthropicProviderOptions(
                            providerId,
                            nextMode,
                            anthropicThinkingBudgetTokens,
                          );
                        if (activeConversation) {
                          void persistConversationProviderOptions(
                            nextProviderOptions,
                          );
                        }
                      }}
                      value={effectiveAnthropicThinkingMode}
                    />
                    {effectiveAnthropicThinkingMode === 'budget' ? (
                      <NumberInput
                        data-testid="chat-anthropic-thinking-budget-input"
                        label="Thinking budget tokens"
                        min={1024}
                        step={256}
                        onChange={(value) => {
                          const nextBudget =
                            typeof value === 'number' ? value : '';
                          setAnthropicThinkingBudgetTokens(nextBudget);
                          if (activeConversation) {
                            void persistConversationProviderOptions(
                              buildAnthropicProviderOptions(
                                providerId,
                                anthropicThinkingMode,
                                nextBudget,
                              ),
                            );
                          }
                        }}
                        value={anthropicThinkingBudgetTokens}
                      />
                    ) : null}
                  </>
                ) : null}
                {thinkingControlVisible ? (
                  <Select
                    data={[
                      { value: 'enabled', label: 'Thinking: enabled' },
                      ...(preserveThinkingSupported
                        ? [
                            {
                              value: 'enabled-preserve',
                              label:
                                'Thinking: enabled + preserve prior reasoning',
                            },
                          ]
                        : []),
                      ...(reasoningCapability?.mandatory
                        ? []
                        : [
                            {
                              value: 'disabled',
                              label: 'Thinking: disabled',
                            },
                          ]),
                    ]}
                    data-testid="chat-thinking-mode-select"
                    disabled={Boolean(model) && !thinkingSupported}
                    label="Thinking"
                    onChange={(value) => {
                      const nextMode =
                        (value as ThinkingUiMode | null) ?? 'enabled';
                      forcedThinkingDisabledRef.current = false;
                      setThinkingMode(nextMode);
                      setReasoningEffort('provider-default');
                      if (activeConversation) {
                        void persistConversationProviderOptions(
                          buildThinkingProviderOptions(
                            providerId,
                            model,
                            nextMode,
                          ),
                        );
                      }
                    }}
                    value={effectiveThinkingMode}
                  />
                ) : null}
                {reasoningEffortControlVisible ? (
                  <Select
                    data={[
                      {
                        value: 'provider-default',
                        label: reasoningCapability?.defaultEffort
                          ? `Provider default (${reasoningCapability.defaultEffort})`
                          : 'Provider default',
                      },
                      ...(reasoningCapability?.supportedEfforts ?? [])
                        .filter(
                          (effort) =>
                            !reasoningCapability?.mandatory ||
                            effort !== 'none',
                        )
                        .map((effort) => ({
                          value: effort,
                          label: `Reasoning effort: ${effort}`,
                        })),
                    ]}
                    data-testid="chat-reasoning-effort-select"
                    label="Reasoning effort"
                    onChange={(value) => {
                      const nextEffort =
                        (value as ReasoningEffortUiMode | null) ??
                        'provider-default';
                      setReasoningEffort(nextEffort);
                      if (nextEffort !== 'provider-default') {
                        setThinkingMode('enabled');
                      }
                      if (activeConversation) {
                        void persistConversationProviderOptions(
                          buildChatProviderOptions({
                            providerId,
                            model,
                            anthropicThinkingMode:
                              effectiveAnthropicThinkingMode,
                            anthropicThinkingBudgetTokens,
                            thinkingMode: effectiveThinkingMode,
                            reasoningSupported: true,
                            reasoningMandatory:
                              reasoningCapability?.mandatory === true,
                            reasoningControls:
                              reasoningCapability?.controls ?? [],
                            reasoningEffort: nextEffort,
                          }),
                        );
                      }
                    }}
                    value={effectiveReasoningEffort}
                  />
                ) : null}
              </Stack>
            </Group>
            {providerCatalogPricingNote ? (
              <Alert color="blue" mb="md" title="Model catalog note">
                {providerCatalogPricingNote}
              </Alert>
            ) : null}
            {providerId && model ? (
              <Alert
                color="blue"
                mb="md"
                title={`${selectedProviderDisplayName} reasoning`}
              >
                {!reasoningCapability
                  ? `The ${selectedProviderDisplayName} model API does not declare reasoning capabilities for ${selectedModelDisplayName}. Chat Lab will not infer them from the model name.`
                  : !reasoningCapability.supported
                    ? `The ${selectedProviderDisplayName} model API declares that ${selectedModelDisplayName} does not support reasoning.`
                    : reasoningCapability.mandatory
                      ? reasoningEffortControlVisible
                        ? `The ${selectedProviderDisplayName} model API declares reasoning mandatory for ${selectedModelDisplayName}. The toggle is unavailable; select a supported effort or keep the provider default.`
                        : `The ${selectedProviderDisplayName} model API declares reasoning mandatory for ${selectedModelDisplayName}. Chat Lab sends no reasoning configuration and uses the provider default.`
                      : providerId === 'anthropic'
                        ? anthropicThinkingMode === 'auto'
                          ? 'Auto uses Anthropic adaptive thinking as declared by the model API.'
                          : anthropicThinkingMode === 'budget'
                            ? 'Budget mode sends a fixed Anthropic thinking budget. The gateway keeps max output tokens above the requested budget.'
                            : 'None explicitly disables Anthropic extended thinking for this conversation.'
                        : preserveThinkingEnabled
                          ? 'Reasoning is enabled and prior reasoning content is preserved when this provider route supports replay.'
                          : effectiveThinkingMode === 'disabled'
                            ? 'Reasoning is disabled for this conversation using the selected provider transport.'
                            : 'Reasoning is enabled for this conversation using capabilities declared by the provider model API.'}
              </Alert>
            ) : null}
            {providerId === 'anthropic' &&
            effectiveAnthropicThinkingMode === 'auto' &&
            model &&
            !anthropicAdaptiveThinkingSupported ? (
              <Alert
                color="yellow"
                mb="md"
                title="Adaptive thinking compatibility"
              >
                This model may reject adaptive thinking. If Anthropic returns a
                400 error, switch to `budget` for older Claude models.
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
                      chatWarning={chatWarning}
                      copiedAssistantMessageId={copiedAssistantMessageId}
                      editingContent={editingContent}
                      editingMessageId={editingMessageId}
                      hiddenMessageCountAbove={hiddenMessageCountAbove}
                      hiddenMessageCountBelow={hiddenMessageCountBelow}
                      isLoadingModels={modelsQuery.isPending}
                      isStreaming={isStreaming}
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
                                normalizedMaxOutputTokens,
                                chatProviderOptions,
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

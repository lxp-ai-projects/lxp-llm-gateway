export type RuntimeConfig = {
  registrationEnabled: boolean;
  forgotPasswordEnabled: boolean;
  gatewayOnline: boolean;
  supportedProviders: Array<{ providerId: string; displayName: string }>;
};

export type SessionUser = {
  userUuid: string;
  email: string;
  displayName: string;
  status: string;
  roles: string[];
};

export type GatewayChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type GatewayChatResponse = {
  requestId: string;
  providerId: string;
  model: string;
  message: {
    role: 'assistant';
    content: string;
    reasoning?: string;
    reasoningDetails?: unknown;
  };
  finishReason?: string | null;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
  };
};

export type GatewayChatStreamChunk = {
  requestId?: string;
  reasoningDelta?: string;
  contentDelta?: string;
  finishReason?: string | null;
};

export type GatewayChatStreamResult = {
  requestId?: string;
  receivedReasoning: boolean;
  receivedContent: boolean;
  finishReason?: string | null;
};

export type ProviderModelSummary = {
  id: string;
  displayName: string;
};

export type ProviderCredentialSummary = {
  id: string;
  userUuid: string;
  providerId: string;
  providerDisplayName: string;
  label: string;
  maskedHint: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type ProviderSettingsSummary = {
  userUuid: string;
  defaultProviderId: string | null;
  defaultModel: string | null;
};

export type AdminUserSummary = {
  userUuid: string;
  displayName: string;
  email: string;
  status: 'active' | 'disabled';
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminCreateUserInput = {
  email: string;
  password: string;
  displayName: string;
  roles?: string[];
};

export type ChatTransferConversation = {
  id: string;
  title: string;
  model: string;
  providerId: string;
  systemPrompt?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
    createdAt: string;
  }>;
  updatedAt: string;
};

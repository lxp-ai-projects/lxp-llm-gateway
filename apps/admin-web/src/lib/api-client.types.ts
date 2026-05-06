export type RuntimeConfig = {
  registrationEnabled: boolean;
  forgotPasswordEnabled: boolean;
  gatewayOnline: boolean;
  supportedProviders: Array<{ providerId: string; displayName: string }>;
};

export type SessionTenantSummary = {
  id: string;
  slug: string;
  displayName: string;
  roles: string[];
  isDirectMember: boolean;
};

export type SessionUser = {
  userUuid: string;
  email: string;
  displayName: string;
  status: string;
  activeTenantId: string;
  activeTenantSlug: string;
  roles: string[];
  globalRoles: string[];
  availableTenants?: SessionTenantSummary[];
};

export type GatewayChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoningContent?: string;
};

export type GatewayAnthropicExtendedThinkingMode =
  | 'disabled'
  | 'adaptive'
  | 'budget';

export type GatewayAnthropicExtendedThinking =
  | {
      mode: 'disabled';
    }
  | {
      mode: 'adaptive';
    }
  | {
      mode: 'budget';
      budgetTokens: number;
    };

export type GatewayZaiThinking =
  | {
      type: 'enabled';
      clearThinking?: boolean;
    }
  | {
      type: 'disabled';
      clearThinking?: boolean;
    };

export type GatewayOpenRouterReasoning = {
  enabled?: boolean;
  exclude?: boolean;
};

export type GatewayOllamaThinking = {
  enabled?: boolean;
};

export type GatewayChatProviderOptions = {
  anthropic?: {
    extendedThinking?: GatewayAnthropicExtendedThinking;
  };
  zai?: {
    thinking?: GatewayZaiThinking;
  };
  openrouter?: {
    reasoning?: GatewayOpenRouterReasoning;
  };
  ollama?: {
    thinking?: GatewayOllamaThinking;
  };
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

export type GatewayImageReference =
  | {
      type: 'image_url';
      url: string;
    }
  | {
      type: 'data_url';
      url: string;
      mimeType?: string;
    }
  | {
      type: 'asset';
      assetId: string;
    };

export type GatewayGeneratedImage = {
  assetId?: string;
  contentUrl?: string;
  url?: string;
  b64Json?: string;
  mimeType?: string;
  revisedPrompt?: string;
  saved?: boolean;
  providerMetadata?: Record<string, unknown>;
};

export type GatewayImageGenerationResponse = {
  jobId?: string;
  requestId: string;
  providerId: string;
  model: string;
  images: GatewayGeneratedImage[];
  providerMetadata?: Record<string, unknown>;
};

export type ImageAspectRatioOption = {
  value: string;
  label: string;
  useCase?: string;
};

export type ImageResolutionOption = {
  value: string;
  label: string;
};

export type ImageOutputFormatOption = {
  value: string;
  label: string;
};

export type ImageBackgroundOption = {
  value: string;
  label: string;
};

export type ImageQualityOption = {
  value: string;
  label: string;
};

export type ImageModerationOption = {
  value: string;
  label: string;
  description?: string;
};

export type ImageInputFidelityOption = {
  value: string;
  label: string;
  description?: string;
};

export type ImageOutputCompressionRange = {
  min: number;
  max: number;
  defaultValue?: number;
  step?: number;
};

export type ImageModeCapabilityOptions = {
  supportedImageAspectRatios?: ImageAspectRatioOption[];
  supportedImageResponseFormats?: Array<'url' | 'b64_json'>;
  supportedImageResolutions?: ImageResolutionOption[];
  supportedImageOutputFormats?: ImageOutputFormatOption[];
  supportedImageBackgrounds?: ImageBackgroundOption[];
  supportedImageQualities?: ImageQualityOption[];
  supportedImageModerations?: ImageModerationOption[];
  supportedImageInputFidelities?: ImageInputFidelityOption[];
  imageOutputCompressionRange?: ImageOutputCompressionRange;
  maxGeneratedImagesPerRequest?: number;
  maxReferenceImagesPerRequest?: number;
  imageDefaults?: {
    aspectRatio?: string;
    responseFormat?: 'url' | 'b64_json';
    resolution?: string;
    background?: string;
    quality?: string;
    moderation?: string;
    outputFormat?: string;
    outputCompression?: number;
    inputFidelity?: string;
    imageCount?: number;
  };
};

export type ProviderModelSummary = {
  id: string;
  displayName: string;
  capabilities?: {
    supportsStreaming?: boolean;
    supportsImageGeneration?: boolean;
    supportsImageEditing?: boolean;
    requiresPaidAccess?: boolean;
    supportedImageAspectRatios?: ImageAspectRatioOption[];
    supportedImageResponseFormats?: Array<'url' | 'b64_json'>;
    supportedImageResolutions?: ImageResolutionOption[];
    supportedImageOutputFormats?: ImageOutputFormatOption[];
    supportedImageBackgrounds?: ImageBackgroundOption[];
    supportedImageQualities?: ImageQualityOption[];
    supportedImageModerations?: ImageModerationOption[];
    supportedImageInputFidelities?: ImageInputFidelityOption[];
    imageOutputCompressionRange?: ImageOutputCompressionRange;
    maxGeneratedImagesPerRequest?: number;
    maxReferenceImagesPerRequest?: number;
    imageDefaults?: {
      aspectRatio?: string;
      responseFormat?: 'url' | 'b64_json';
      resolution?: string;
      background?: string;
      quality?: string;
      moderation?: string;
      outputFormat?: string;
      outputCompression?: number;
      inputFidelity?: string;
      imageCount?: number;
    };
    imageGenerationOptions?: ImageModeCapabilityOptions;
    imageEditOptions?: ImageModeCapabilityOptions;
  };
};

export type GatewayImageCatalogProvider = {
  providerId: string;
  displayName: string;
  defaultModelId: string | null;
  models: ProviderModelSummary[];
};

export type GatewayImageCatalogResponse = {
  providers: GatewayImageCatalogProvider[];
};

export type GatewayImageAssetSummary = {
  id: string;
  label: string | null;
  mimeType: string | null;
  contentUrl: string;
  sourceType: 'upload' | 'generated';
  saved: boolean;
  createdAt: string;
};

export type GatewayImageAssetListResponse = {
  items: GatewayImageAssetSummary[];
};

export type GatewayImageAssetUpdateRequest = {
  label: string;
};

export type GatewayImageHistoryItem = {
  id: string;
  requestId: string;
  providerId: string;
  model: string;
  prompt: string;
  mode: 'generation' | 'edit';
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  durationMs?: number;
  providerMetadata?: Record<string, unknown>;
  images: Array<
    GatewayImageAssetSummary & {
      revisedPrompt?: string;
      providerMetadata?: Record<string, unknown>;
    }
  >;
};

export type GatewayImageHistoryResponse = {
  items: GatewayImageHistoryItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
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
  defaultImageProviderId: string | null;
  defaultImageModel: string | null;
};

export type AdminUserSummary = {
  userUuid: string;
  tenantId: string;
  displayName: string;
  email: string;
  status: 'active' | 'disabled';
  roles: string[];
  globalRoles?: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminTenantSummary = {
  id: string;
  slug: string;
  displayName: string;
  allowUserCredentialOverride: boolean;
  status: 'active' | 'disabled';
  membershipCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTenantMembershipSummary = {
  tenantId: string;
  userUuid: string;
  displayName: string;
  email: string;
  status: 'active' | 'disabled';
  roles: string[];
  globalRoles: string[];
  createdAt: string;
};

export type AdminTenantProviderConfigurationSummary = {
  id: string | null;
  tenantId: string;
  providerId: string;
  providerDisplayName: string;
  providerStatus: 'active' | 'disabled';
  enabled: boolean;
  defaultTextModel: string | null;
  defaultImageModel: string | null;
  credentialMode: 'platform_default' | 'tenant_byok' | 'user_byok' | 'hybrid';
  preferUserCredentials: boolean;
  allowPlatformFallback: boolean;
  allowTenantFallback: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminTenantProviderConfigurationTestResult = {
  tenantId: string;
  providerId: string;
  providerDisplayName: string;
  configuration: AdminTenantProviderConfigurationSummary;
  testedUserUuid: string | null;
  userCredentialAvailable: boolean;
  tenantCredentialAvailable: boolean;
  platformCredentialAvailable: boolean;
  canResolve: boolean;
  resolvedCredentialScope: 'user' | 'tenant' | 'platform' | null;
  message: string;
};

export type AdminTenantModelAccessRuleSummary = {
  id: string;
  tenantId: string;
  providerId: string;
  modelPattern: string;
  capability: 'text' | 'image' | 'stt' | 'tts' | 'embedding';
  effect: 'allow' | 'deny';
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  maxImagesPerRequest: number | null;
  maxResolution: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTenantPolicySummary = {
  tenantId: string;
  monthlyBudgetUsd: string | null;
  dailyRequestLimit: number | null;
  monthlyRequestLimit: number | null;
  requestsPerMinute: number;
  tokensPerMinute: number;
  monthlyTokenLimit: number | null;
  imageRequestsPerMonth: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  allowPromptLogging: boolean;
  allowResponseLogging: boolean;
  retentionDays: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AdminTenantIntegrationClientSummary = {
  id: string;
  tenantId: string;
  clientId: string;
  displayName: string;
  applicationId: string;
  defaultUserUuid: string | null;
  defaultUserDisplayName: string | null;
  scopes: string[];
  trustedForwardedIdentityEnabled: boolean;
  status: 'active' | 'disabled';
  apiKeyCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTenantIntegrationApiKeySummary = {
  id: string;
  tenantId: string;
  integrationClientId: string;
  integrationClientClientId: string;
  label: string;
  keyHint: string | null;
  scopes: string[];
  status: 'active' | 'disabled';
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminTenantIntegrationApiKeySecretSummary = {
  apiKey: string;
  summary: AdminTenantIntegrationApiKeySummary;
};

export type AdminTenantUsageEventSummary = {
  id: string;
  requestId: string;
  userUuid: string;
  operation: 'chat' | 'image_generation' | 'image_edit';
  capability: 'text' | 'image' | 'stt' | 'tts' | 'embedding' | null;
  providerId: string;
  model: string;
  identitySource: string;
  integrationClientId: string | null;
  apiKeyId: string | null;
  credentialScopeUsed: 'platform' | 'tenant' | 'user' | null;
  status: 'success' | 'error' | 'blocked_by_policy' | 'blocked_by_quota';
  errorCode: string | null;
  totalTokens: number | null;
  imageCount: number | null;
  costEstimateUsd: string | null;
  latencyMs: number | null;
  createdAt: string;
};

export type AdminTenantUsageSummary = {
  tenantId: string;
  requests24h: number;
  requests7d: number;
  requests30d: number;
  distinctUsers24h: number;
  activeUsers30d: number;
  blockedRequests7d: number;
  estimatedCostUsd30d: string;
};

export type AdminTenantUsageByProviderSummary = {
  providerId: string;
  requests30d: number;
  blockedRequests30d: number;
  estimatedCostUsd30d: string;
  lastRequestAt: string | null;
};

export type AdminTenantUsageByModelSummary = {
  providerId: string;
  model: string;
  capability: 'text' | 'image' | 'stt' | 'tts' | 'embedding' | null;
  requests30d: number;
  blockedRequests30d: number;
  estimatedCostUsd30d: string;
  lastRequestAt: string | null;
};

export type AdminCreateTenantInput = {
  slug: string;
  displayName: string;
  allowUserCredentialOverride?: boolean;
};

export type AdminUpdateTenantInput = {
  displayName?: string;
  allowUserCredentialOverride?: boolean;
  status?: 'active' | 'disabled';
};

export type AdminCreateUserInput = {
  email: string;
  password: string;
  displayName: string;
  roles?: string[];
};

export type AdminCreateTenantMembershipInput = {
  email: string;
  password?: string;
  displayName?: string;
  roles?: string[];
};

export type AdminUpdateUserInput = {
  displayName?: string;
  status?: 'active' | 'disabled';
  roles?: string[];
  password?: string;
};

export type AdminUpdateGlobalRolesInput = {
  globalRoles: string[];
};

export type AdminUpdateTenantProviderConfigurationInput = {
  enabled: boolean;
  defaultTextModel?: string;
  defaultImageModel?: string;
  credentialMode: 'platform_default' | 'tenant_byok' | 'user_byok' | 'hybrid';
  preferUserCredentials: boolean;
  allowPlatformFallback: boolean;
  allowTenantFallback: boolean;
};

export type AdminUpdateTenantPolicyInput = {
  monthlyBudgetUsd?: string;
  dailyRequestLimit?: number;
  monthlyRequestLimit?: number;
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  monthlyTokenLimit?: number;
  imageRequestsPerMonth?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  allowPromptLogging?: boolean;
  allowResponseLogging?: boolean;
  retentionDays?: number;
};

export type AdminTestTenantProviderConfigurationInput = {
  userUuid?: string;
};

export type AdminCreateTenantModelAccessRuleInput = {
  providerId: string;
  modelPattern: string;
  capability: 'text' | 'image' | 'stt' | 'tts' | 'embedding';
  effect: 'allow' | 'deny';
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxImagesPerRequest?: number;
  maxResolution?: string;
  priority?: number;
};

export type AdminUpdateTenantModelAccessRuleInput =
  Partial<AdminCreateTenantModelAccessRuleInput>;

export type AdminCreateIntegrationClientInput = {
  clientId: string;
  displayName: string;
  applicationId: string;
  defaultUserUuid?: string;
  scopes: Array<'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'>;
  trustedForwardedIdentityEnabled: boolean;
};

export type AdminUpdateIntegrationClientInput = {
  displayName?: string;
  applicationId?: string;
  defaultUserUuid?: string;
  scopes?: Array<'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'>;
  trustedForwardedIdentityEnabled?: boolean;
  status?: 'active' | 'disabled';
};

export type AdminCreateIntegrationApiKeyInput = {
  label: string;
  scopes?: Array<'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'>;
  expiresAt?: string;
};

export type AdminUpdateIntegrationApiKeyInput = {
  label?: string;
  scopes?: Array<'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'>;
  status?: 'active' | 'disabled';
  expiresAt?: string;
};

export type ChatTransferConversation = {
  id: string;
  title: string;
  model: string;
  providerId: string;
  maxOutputTokens?: number;
  providerOptions?: GatewayChatProviderOptions;
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

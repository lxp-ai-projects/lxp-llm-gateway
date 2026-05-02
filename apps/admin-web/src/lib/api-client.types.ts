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

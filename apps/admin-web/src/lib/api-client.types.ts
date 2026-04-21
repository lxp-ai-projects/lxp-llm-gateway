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

export type GatewayImageReference =
  | {
      type: 'image_url';
      url: string;
    }
  | {
      type: 'data_url';
      url: string;
      mimeType?: string;
    };

export type GatewayGeneratedImage = {
  url?: string;
  b64Json?: string;
  mimeType?: string;
  revisedPrompt?: string;
  providerMetadata?: Record<string, unknown>;
};

export type GatewayImageGenerationResponse = {
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

export type ProviderModelSummary = {
  id: string;
  displayName: string;
  capabilities?: {
    supportsStreaming?: boolean;
    supportsImageGeneration?: boolean;
    supportsImageEditing?: boolean;
    supportedImageAspectRatios?: ImageAspectRatioOption[];
    supportedImageResponseFormats?: Array<'url' | 'b64_json'>;
    supportedImageResolutions?: ImageResolutionOption[];
    supportedImageOutputFormats?: ImageOutputFormatOption[];
    supportedImageBackgrounds?: ImageBackgroundOption[];
    supportedImageQualities?: ImageQualityOption[];
    supportedImageInputFidelities?: ImageInputFidelityOption[];
    imageOutputCompressionRange?: ImageOutputCompressionRange;
    maxGeneratedImagesPerRequest?: number;
    maxReferenceImagesPerRequest?: number;
  };
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

import type { ProviderId } from '@lxp/domain';

export type GatewayChatContentPart =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
        detail?: string;
      };
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

export interface GatewayOpenRouterReasoning {
  enabled?: boolean;
  exclude?: boolean;
}

export interface GatewayOllamaThinking {
  enabled?: boolean;
}

export interface GatewayChatProviderOptions {
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
}

export interface GatewayChatRequest {
  providerId?: ProviderId;
  model?: string;
  maxOutputTokens?: number;
  providerOptions?: GatewayChatProviderOptions;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string | GatewayChatContentPart[];
    reasoningContent?: string;
  }>;
  stream?: boolean;
}

export interface GatewayChatResponse {
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
  providerMetadata?: Record<string, unknown>;
}

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

export type GatewayImageResponseFormat = 'url' | 'b64_json';

export type GatewayImageResolution = string;

export type GatewayImageOutputCompression = number;

export interface GatewayImageGenerationRequest {
  providerId?: ProviderId;
  model?: string;
  prompt: string;
  n?: number;
  aspectRatio?: string;
  responseFormat?: GatewayImageResponseFormat;
  resolution?: GatewayImageResolution;
  background?: string;
  quality?: string;
  moderation?: string;
  outputFormat?: string;
  outputCompression?: GatewayImageOutputCompression;
}

export interface GatewayImageEditRequest {
  providerId?: ProviderId;
  model?: string;
  prompt: string;
  images: GatewayImageReference[];
  n?: number;
  aspectRatio?: string;
  responseFormat?: GatewayImageResponseFormat;
  resolution?: GatewayImageResolution;
  background?: string;
  quality?: string;
  moderation?: string;
  outputFormat?: string;
  outputCompression?: GatewayImageOutputCompression;
  inputFidelity?: string;
}

export interface GatewayGeneratedImage {
  assetId?: string;
  contentUrl?: string;
  url?: string;
  b64Json?: string;
  mimeType?: string;
  revisedPrompt?: string;
  saved?: boolean;
  providerMetadata?: Record<string, unknown>;
}

export interface GatewayImageModeCapabilityOptions {
  supportedImageAspectRatios?: Array<{
    value: string;
    label: string;
    useCase?: string;
  }>;
  supportedImageResponseFormats?: Array<'url' | 'b64_json'>;
  supportedImageResolutions?: Array<{
    value: string;
    label: string;
  }>;
  supportedImageOutputFormats?: Array<{
    value: string;
    label: string;
  }>;
  supportedImageBackgrounds?: Array<{
    value: string;
    label: string;
  }>;
  supportedImageQualities?: Array<{
    value: string;
    label: string;
  }>;
  supportedImageModerations?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  supportedImageInputFidelities?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  imageOutputCompressionRange?: {
    min: number;
    max: number;
    defaultValue?: number;
    step?: number;
  };
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
}

export interface GatewayImageGenerationResponse {
  jobId?: string;
  requestId: string;
  providerId: string;
  model: string;
  images: GatewayGeneratedImage[];
  providerMetadata?: Record<string, unknown>;
}

export interface GatewayImageCatalogModel {
  id: string;
  displayName: string;
  capabilities?: {
    supportsStreaming?: boolean;
    supportsImageGeneration?: boolean;
    supportsImageEditing?: boolean;
    requiresPaidAccess?: boolean;
    supportedImageAspectRatios?: Array<{
      value: string;
      label: string;
      useCase?: string;
    }>;
    supportedImageResponseFormats?: Array<'url' | 'b64_json'>;
    supportedImageResolutions?: Array<{
      value: string;
      label: string;
    }>;
    supportedImageOutputFormats?: Array<{
      value: string;
      label: string;
    }>;
    supportedImageBackgrounds?: Array<{
      value: string;
      label: string;
    }>;
    supportedImageQualities?: Array<{
      value: string;
      label: string;
    }>;
    supportedImageModerations?: Array<{
      value: string;
      label: string;
      description?: string;
    }>;
    supportedImageInputFidelities?: Array<{
      value: string;
      label: string;
      description?: string;
    }>;
    imageOutputCompressionRange?: {
      min: number;
      max: number;
      defaultValue?: number;
      step?: number;
    };
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
    imageGenerationOptions?: GatewayImageModeCapabilityOptions;
    imageEditOptions?: GatewayImageModeCapabilityOptions;
  };
}

export interface GatewayImageCatalogProvider {
  providerId: ProviderId;
  displayName: string;
  defaultModelId: string | null;
  models: GatewayImageCatalogModel[];
}

export interface GatewayImageCatalogResponse {
  providers: GatewayImageCatalogProvider[];
}

export interface GatewayImageAssetSummary {
  id: string;
  label: string | null;
  mimeType: string | null;
  contentUrl: string;
  sourceType: 'upload' | 'generated';
  saved: boolean;
  createdAt: string;
}

export interface GatewayImageHistoryItem {
  id: string;
  requestId: string;
  providerId: ProviderId;
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
}

export interface GatewayImageHistoryResponse {
  items: GatewayImageHistoryItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface GatewayImageAssetUploadRequest {
  dataUrl: string;
  label?: string;
}

export interface GatewayImageAssetUploadResponse {
  asset: GatewayImageAssetSummary;
}

export interface GatewayImageAssetListResponse {
  items: GatewayImageAssetSummary[];
}

export interface GatewayImageAssetSaveRequest {
  saved: boolean;
}

export interface GatewayImageAssetUpdateRequest {
  label: string;
}

export interface GatewayErrorResponse {
  code: string;
  message: string;
}

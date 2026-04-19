export type ProviderId =
  | 'nanogpt'
  | 'openrouter'
  | 'ollama'
  | 'groq'
  | 'google'
  | 'xai'
  | 'openai'
  | 'anthropic';

export type StreamSupport = 'none' | 'server-sent-events' | 'chunked';

export interface ProviderCapabilities {
  chat: boolean;
  modelCatalog: boolean;
  imageGeneration: boolean;
  imageEditing: boolean;
}

export interface ImageAspectRatioOption {
  value: string;
  label: string;
  useCase?: string;
}

export interface ImageResolutionOption {
  value: string;
  label: string;
}

export interface ModelCapability {
  id: string;
  supportsStreaming: boolean;
  supportsImageGeneration?: boolean;
  supportsImageEditing?: boolean;
  supportedImageAspectRatios?: ImageAspectRatioOption[];
  supportedImageResponseFormats?: string[];
  supportedImageResolutions?: ImageResolutionOption[];
  maxGeneratedImagesPerRequest?: number;
  maxReferenceImagesPerRequest?: number;
}

export interface GatewayRequestContext {
  requestId: string;
  callerId: string;
}

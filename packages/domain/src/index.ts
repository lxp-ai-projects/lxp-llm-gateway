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

export interface ImageOutputFormatOption {
  value: string;
  label: string;
}

export interface ImageBackgroundOption {
  value: string;
  label: string;
}

export interface ImageQualityOption {
  value: string;
  label: string;
}

export interface ImageInputFidelityOption {
  value: string;
  label: string;
  description?: string;
}

export interface ImageOutputCompressionRange {
  min: number;
  max: number;
  defaultValue?: number;
  step?: number;
}

export interface ModelCapability {
  id: string;
  supportsStreaming: boolean;
  supportsImageGeneration?: boolean;
  supportsImageEditing?: boolean;
  supportedImageAspectRatios?: ImageAspectRatioOption[];
  supportedImageResponseFormats?: string[];
  supportedImageResolutions?: ImageResolutionOption[];
  supportedImageOutputFormats?: ImageOutputFormatOption[];
  supportedImageBackgrounds?: ImageBackgroundOption[];
  supportedImageQualities?: ImageQualityOption[];
  supportedImageInputFidelities?: ImageInputFidelityOption[];
  imageOutputCompressionRange?: ImageOutputCompressionRange;
  maxGeneratedImagesPerRequest?: number;
  maxReferenceImagesPerRequest?: number;
}

export interface GatewayRequestContext {
  requestId: string;
  callerId: string;
}

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

export interface ImageModerationOption {
  value: string;
  label: string;
  description?: string;
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

export interface ImageModelDefaults {
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
}

export interface ImageModeCapabilityOptions {
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
  imageDefaults?: ImageModelDefaults;
}

export interface ModelCapability {
  id: string;
  supportsStreaming: boolean;
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
  imageDefaults?: ImageModelDefaults;
  imageGenerationOptions?: ImageModeCapabilityOptions;
  imageEditOptions?: ImageModeCapabilityOptions;
}

export interface ImageProviderModelCatalogEntry {
  id: string;
  displayName: string;
  capabilities: Partial<ModelCapability>;
}

export interface ImageProviderCatalog {
  providerId: ProviderId;
  defaultModelId: string | null;
  models: ImageProviderModelCatalogEntry[];
}

export interface GatewayRequestContext {
  requestId: string;
  callerId: string;
}

export const PROVIDER_IDS = [
  'nanogpt',
  'openrouter',
  'ollama',
  'groq',
  'google',
  'xai',
  'openai',
  'anthropic',
  'mistral',
  'deepseek',
  'moonshot',
  'zai',
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export const PROVIDER_DISPLAY_NAMES: Record<ProviderId, string> = {
  nanogpt: 'NanoGPT',
  openrouter: 'OpenRouter',
  ollama: 'Ollama',
  groq: 'Groq',
  google: 'Google Gemini',
  xai: 'xAI Grok',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  mistral: 'Mistral',
  deepseek: 'DeepSeek',
  moonshot: 'Moonshot / Kimi',
  zai: 'Z.ai',
};

export const SUPPORTED_PROVIDERS = PROVIDER_IDS.map((providerId) => ({
  providerId,
  displayName: PROVIDER_DISPLAY_NAMES[providerId],
})) as ReadonlyArray<{
  providerId: ProviderId;
  displayName: string;
}>;

export const IMAGE_PROVIDER_IDS = [
  'nanogpt',
  'openrouter',
  'google',
  'xai',
  'openai',
  'zai',
] as const satisfies readonly ProviderId[];

export type ImageProviderId = (typeof IMAGE_PROVIDER_IDS)[number];

export type TenantRole = 'tenant_admin' | 'operator' | 'user' | 'viewer';

export type GlobalRole = 'super_admin';

export const TENANT_ROLE_VALUES: TenantRole[] = [
  'tenant_admin',
  'operator',
  'user',
  'viewer',
];

export const GLOBAL_ROLE_VALUES: GlobalRole[] = ['super_admin'];

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

export type ReasoningModelFamily = 'zai-glm';

export function detectReasoningModelFamily(
  modelId: string | undefined,
): ReasoningModelFamily | null {
  if (!modelId) {
    return null;
  }

  return /(^|[/:])glm-(5(?:[.:\-/_]|$)|4\.(?:7|6|5)(?:[.:\-/_]|$))/i.test(
    modelId,
  )
    ? 'zai-glm'
    : null;
}

export function supportsThinkingModelFamily(
  providerId: ProviderId | string,
  modelId: string | undefined,
): boolean {
  if (!modelId) {
    return false;
  }

  const family = detectReasoningModelFamily(modelId);
  if (family !== 'zai-glm') {
    return false;
  }

  return (
    providerId === 'zai' ||
    providerId === 'openrouter' ||
    providerId === 'ollama' ||
    (providerId === 'nanogpt' && /^z-ai\//i.test(modelId))
  );
}

export function supportsPreservedThinking(
  providerId: ProviderId | string,
  modelId: string | undefined,
): boolean {
  if (!supportsThinkingModelFamily(providerId, modelId)) {
    return false;
  }

  return providerId === 'zai' || providerId === 'nanogpt';
}

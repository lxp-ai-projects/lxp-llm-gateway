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
  videoGeneration?: boolean;
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
  supportsVideoGeneration?: boolean;
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

export * from './media-generation.js';

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

export interface ImageReferenceLimitModel {
  id: string;
  displayName?: string;
  capabilities?: {
    maxReferenceImagesPerRequest?: number;
    imageEditOptions?: {
      maxReferenceImagesPerRequest?: number;
    };
  };
}

export interface GatewayRequestContext {
  requestId: string;
  callerId: string;
}

export type ReasoningModelFamily = 'zai-glm';

export const GLM_THINKING_MODEL_PATTERN =
  /(^|[/:])glm-(5(?:[.:\-/_]|$)|4\.(?:7|6|5)(?:[.:\-/_]|$))/i;

export function isGlmThinkingModel(modelId: string | undefined): boolean {
  if (!modelId) {
    return false;
  }

  return GLM_THINKING_MODEL_PATTERN.test(modelId);
}

export function detectReasoningModelFamily(
  modelId: string | undefined,
): ReasoningModelFamily | null {
  return isGlmThinkingModel(modelId) ? 'zai-glm' : null;
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

export function resolveMaxReferenceImages(
  providerId: ProviderId | string | undefined,
  model: ImageReferenceLimitModel | undefined,
): number {
  const editOptions = model?.capabilities?.imageEditOptions;
  const catalogValue =
    editOptions?.maxReferenceImagesPerRequest ??
    model?.capabilities?.maxReferenceImagesPerRequest;

  if (providerId !== 'nanogpt' || !model) {
    return typeof catalogValue === 'number' && catalogValue > 0 ? catalogValue : 5;
  }

  const normalizedModelId = normalizeModelToken(model.id);
  const normalizedDisplayName = normalizeModelToken(model.displayName);

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'seedream-4-0',
      'seedream-4-0-250828',
      'seedream-4-5',
      'seedream-4-5-251128',
      'seedream-5-0-lite',
      'seedream-5-0-lite-260128',
      'seedream-5-lite',
    )
  ) {
    return Math.max(catalogValue ?? 0, 10);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'nano-banana-2',
      'nano-banana-2-fast',
      'nano-banana-pro',
      'nano-banana-pro-edit',
      'nano-banana-pro-ultra',
    )
  ) {
    return Math.max(catalogValue ?? 0, 14);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'nano-banana-pro-edit-ultra',
    )
  ) {
    return Math.max(catalogValue ?? 0, 10);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'qwen-image',
      'qwen-image-edit',
      'qwen-image-img2img',
    )
  ) {
    return Math.max(catalogValue ?? 0, 3);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'wan-2-7-image-pro',
      'wan2-7-image-pro',
      'wan2-7-image-professional-edition',
    )
  ) {
    return Math.max(catalogValue ?? 0, 9);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'nano-banana',
      'nano-banana-edit',
      'gemini-flash-edit',
      'gpt-4o-image',
      'flux-kontext',
      'flux-kontext-dev',
    )
  ) {
    return Math.max(catalogValue ?? 0, 5);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'gpt-image-1',
      'gpt-image-1-5',
      'gpt-image-1-mini',
      'chatgpt-image-latest',
    )
  ) {
    return Math.max(catalogValue ?? 0, 16);
  }

  if (
    isOneOf(
      normalizedModelId,
      normalizedDisplayName,
      'seededit-3-0',
      'seededit-3-0-i2i',
      'seededit-3-0-i2i-250628',
    )
  ) {
    return 1;
  }

  return typeof catalogValue === 'number' && catalogValue > 0 ? catalogValue : 5;
}

function normalizeModelToken(value: string | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_/\s.]+/g, '-')
    .replace(/-+/g, '-');
}

function isOneOf(valueA: string, valueB: string, ...candidates: string[]): boolean {
  return candidates.includes(valueA) || candidates.includes(valueB);
}

export declare const PROVIDER_IDS: readonly ["nanogpt", "openrouter", "ollama", "groq", "google", "xai", "openai", "anthropic", "mistral", "deepseek", "moonshot", "zai"];
export type ProviderId = (typeof PROVIDER_IDS)[number];
export declare const PROVIDER_DISPLAY_NAMES: Record<ProviderId, string>;
export declare const SUPPORTED_PROVIDERS: ReadonlyArray<{
    providerId: ProviderId;
    displayName: string;
}>;
export declare const IMAGE_PROVIDER_IDS: readonly ["nanogpt", "openrouter", "google", "xai", "openai", "zai"];
export type ImageProviderId = (typeof IMAGE_PROVIDER_IDS)[number];
export type TenantRole = 'tenant_admin' | 'operator' | 'user' | 'viewer';
export type GlobalRole = 'super_admin';
export declare const TENANT_ROLE_VALUES: TenantRole[];
export declare const GLOBAL_ROLE_VALUES: GlobalRole[];
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
export declare const GLM_THINKING_MODEL_PATTERN: RegExp;
export declare function isGlmThinkingModel(modelId: string | undefined): boolean;
export declare function detectReasoningModelFamily(modelId: string | undefined): ReasoningModelFamily | null;
export declare function supportsThinkingModelFamily(providerId: ProviderId | string, modelId: string | undefined): boolean;
export declare function supportsPreservedThinking(providerId: ProviderId | string, modelId: string | undefined): boolean;
export declare function resolveMaxReferenceImages(providerId: ProviderId | string | undefined, model: ImageReferenceLimitModel | undefined): number;

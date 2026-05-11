import type {
  GatewayChatRequest,
  GatewayChatResponse,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
  GatewayVideoGenerationJob,
  GatewayVideoGenerationRequest,
} from '@lxp/contracts';
import type {
  ImageProviderCatalog,
  ModelCapability,
  ProviderCapabilities,
  ProviderId,
  VideoProviderCatalog,
} from '@lxp/domain';

export interface ProviderAccessConfig {
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface ProviderExecutionContext {
  requestId: string;
  userId: string;
  providerAccess: ProviderAccessConfig;
  metadata?: Record<string, unknown>;
}

export interface ProviderModel {
  id: string;
  displayName: string;
  capabilities?: Partial<ModelCapability>;
}

export interface ProviderModelDescriptor extends ProviderModel {
  capabilities: Partial<ModelCapability>;
}

export interface ProviderCatalog extends ImageProviderCatalog {
  models: ProviderModelDescriptor[];
}

export interface LlmProviderAdapter {
  readonly providerId: ProviderId;
  readonly capabilities: ProviderCapabilities;

  supportsStreaming(): boolean;

  listModels?(context: ProviderExecutionContext): Promise<ProviderModel[]>;

  listImageCatalog?(
    context: ProviderExecutionContext,
  ): Promise<ImageProviderCatalog>;

  listVideoCatalog?(
    context: ProviderExecutionContext,
  ): Promise<VideoProviderCatalog>;

  countTextTokens?(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<{
    inputTokens: number;
  }>;

  chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse>;

  chatStream?(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>>;

  generateImage?(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse>;

  editImage?(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse>;

  submitVideoGeneration?(
    request: GatewayVideoGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob>;

  getVideoGenerationJob?(
    jobId: string,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob>;

  downloadVideoOutput?(
    jobId: string,
    outputIndex: number,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>>;

  cancelVideoGeneration?(
    jobId: string,
    context: ProviderExecutionContext,
  ): Promise<void>;
}

export {
  fetchPublicImageReferenceAsDataUrl,
  parseDataUrlReference,
  resolveGatewayImageReference,
  validatePublicHttpsImageUrl,
} from './image-reference-utils.js';
export type {
  CanonicalImageAssetReference,
  CanonicalImageEditRequest,
  CanonicalImageGenerateRequest,
  CanonicalImageProviderCatalog,
  CanonicalImageResult,
  ImageModelCapabilities,
  ImageModelDescriptor,
  ImageModelLifecycleStatus,
} from './image-contracts.js';
export type {
  CanonicalVideoGenerationJob,
  CanonicalVideoGenerationRequest,
  CanonicalVideoOutput,
  CanonicalVideoProviderCatalog,
  GatewayVideoCatalogProviderDescriptor,
  VideoModelDescriptor,
  VideoModelLifecycleStatus,
} from './video-contracts.js';
export {
  buildProviderHttpError,
  buildProviderImageHttpError,
  formatGoogleGeminiRateLimitError,
  formatGoogleGeminiTemporaryUnavailableError,
  formatOpenAiRateLimitError,
  formatXAiImageClientError,
} from './provider-error-utils.js';
export { OpenAiCompatibleTextProviderAdapter } from './openai-compatible-text-provider.js';
export type {
  PublicImageReferencePolicy,
  ResolvedGatewayImageReference,
} from './image-reference-utils.js';
export type { OpenAiCompatibleTextProviderOptions } from './openai-compatible-text-provider.js';
export {
  assertBasicChatResponseContract,
  assertProviderModelIds,
  createJsonResponse,
  readStreamAsText,
} from './provider-testkit.js';

export interface VideoProviderAdapter {
  readonly providerId: ProviderId;

  listVideoCatalog?(
    context: ProviderExecutionContext,
  ): Promise<VideoProviderCatalog>;

  submitVideoGeneration(
    request: GatewayVideoGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob>;

  getVideoGenerationJob(
    jobId: string,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob>;

  downloadVideoOutput(
    jobId: string,
    outputIndex: number,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>>;

  cancelVideoGeneration?(
    jobId: string,
    context: ProviderExecutionContext,
  ): Promise<void>;
}

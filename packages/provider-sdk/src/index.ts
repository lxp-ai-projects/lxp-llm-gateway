import type {
  GatewayChatRequest,
  GatewayChatResponse,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import type {
  ModelCapability,
  ProviderCapabilities,
  ProviderId,
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
}

export interface ProviderModel {
  id: string;
  displayName: string;
  capabilities?: Partial<ModelCapability>;
}

export interface LlmProviderAdapter {
  readonly providerId: ProviderId;
  readonly capabilities: ProviderCapabilities;

  supportsStreaming(): boolean;

  listModels?(context: ProviderExecutionContext): Promise<ProviderModel[]>;

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
}

export {
  fetchPublicImageReferenceAsDataUrl,
  parseDataUrlReference,
  resolveGatewayImageReference,
  validatePublicHttpsImageUrl,
} from './image-reference-utils';
export type {
  PublicImageReferencePolicy,
  ResolvedGatewayImageReference,
} from './image-reference-utils';

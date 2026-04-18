import type { GatewayChatRequest, GatewayChatResponse } from '@lxp/contracts';
import type { ProviderId } from '@lxp/domain';

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
}

export interface LlmProviderAdapter {
  readonly providerId: ProviderId;

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
}

import {
  chatStreamWithSessionRefresh,
  gatewayApiUrl,
  request,
} from './api-base';
import type {
  GatewayChatMessage,
  GatewayChatResponse,
  GatewayChatStreamChunk,
  GatewayChatStreamResult,
  ProviderModelSummary,
} from './api-client.types';

export const gatewayApiClient = {
  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>(`${gatewayApiUrl}/api/v1/health`);
  },

  async getModels(providerId = 'nanogpt'): Promise<{
    providerId: string;
    models: ProviderModelSummary[];
  }> {
    const endpoint = providerId
      ? `${gatewayApiUrl}/api/v1/models?providerId=${encodeURIComponent(providerId)}`
      : `${gatewayApiUrl}/api/v1/models`;

    return request(endpoint);
  },

  async chat(payload: {
    providerId?: string;
    model?: string;
    stream: false;
    messages: GatewayChatMessage[];
  }): Promise<GatewayChatResponse> {
    return request<GatewayChatResponse>(`${gatewayApiUrl}/api/v1/chat`, {
      method: 'POST',
      body: JSON.stringify(payload),
      timeoutMs: 90000,
    });
  },

  async chatStream(
    payload: {
      providerId?: string;
      model?: string;
      stream: true;
      messages: GatewayChatMessage[];
    },
    handlers: {
      onChunk: (chunk: GatewayChatStreamChunk) => void;
    },
  ): Promise<GatewayChatStreamResult> {
    return chatStreamWithSessionRefresh(payload, handlers, false);
  },
};

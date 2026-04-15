import type { ProviderId } from '@lxp/domain';

export interface GatewayChatRequest {
  providerId?: ProviderId;
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
}

export interface GatewayChatResponse {
  requestId: string;
  providerId: string;
  model: string;
  message: {
    role: 'assistant';
    content: string;
    reasoning?: string;
    reasoningDetails?: unknown;
  };
  finishReason?: string | null;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    reasoningTokens?: number;
  };
  providerMetadata?: Record<string, unknown>;
}

export interface GatewayErrorResponse {
  code: string;
  message: string;
}

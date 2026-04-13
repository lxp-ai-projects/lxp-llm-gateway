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
  outputText: string;
}

export interface GatewayErrorResponse {
  code: string;
  message: string;
}

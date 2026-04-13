export interface GatewayChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream?: boolean;
}

export interface GatewayChatResponse {
  providerId: string;
  model: string;
  outputText: string;
}

export interface GatewayErrorResponse {
  code: string;
  message: string;
}

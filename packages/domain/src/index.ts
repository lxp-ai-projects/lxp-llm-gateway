export type ProviderId =
  | 'nanogpt'
  | 'openrouter'
  | 'ollama'
  | 'groq'
  | 'xai'
  | 'openai'
  | 'anthropic';

export type StreamSupport = 'none' | 'server-sent-events' | 'chunked';

export interface ModelCapability {
  id: string;
  supportsStreaming: boolean;
}

export interface GatewayRequestContext {
  requestId: string;
  callerId: string;
}

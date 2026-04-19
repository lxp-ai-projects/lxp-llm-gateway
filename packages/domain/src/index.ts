export type ProviderId =
  | 'nanogpt'
  | 'openrouter'
  | 'ollama'
  | 'groq'
  | 'google'
  | 'xai'
  | 'openai'
  | 'anthropic';

export type StreamSupport = 'none' | 'server-sent-events' | 'chunked';

export interface ProviderCapabilities {
  chat: boolean;
  modelCatalog: boolean;
  imageGeneration: boolean;
  imageEditing: boolean;
}

export interface ModelCapability {
  id: string;
  supportsStreaming: boolean;
  supportsImageGeneration?: boolean;
  supportsImageEditing?: boolean;
}

export interface GatewayRequestContext {
  requestId: string;
  callerId: string;
}

import { shouldAttemptSessionRefresh } from './http-auth';
import { DEFAULT_STREAM_IDLE_TIMEOUT_MS } from './chat-stream';

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveApiBaseUrl(explicitUrl: string | undefined, fallbackPort: number): string {
  if (typeof window === 'undefined') {
    return explicitUrl ?? `http://localhost:${fallbackPort}`;
  }

  const currentUrl = new URL(window.location.origin);
  const configuredUrl = explicitUrl ? new URL(explicitUrl) : new URL(`http://localhost:${fallbackPort}`);
  const hostnameMismatch = configuredUrl.hostname !== currentUrl.hostname;
  const shouldPreferCurrentHost =
    hostnameMismatch &&
    (isLoopbackHost(configuredUrl.hostname) || isLoopbackHost(currentUrl.hostname));

  if (shouldPreferCurrentHost) {
    configuredUrl.protocol = currentUrl.protocol;
    configuredUrl.hostname = currentUrl.hostname;
  }

  return configuredUrl.toString().replace(/\/$/, '');
}

const adminApiUrl = resolveApiBaseUrl(import.meta.env.VITE_ADMIN_API_URL, 3002);
const gatewayApiUrl = resolveApiBaseUrl(import.meta.env.VITE_GATEWAY_API_URL, 3001);
let refreshInFlight: Promise<void> | null = null;
export const SESSION_TIMEOUT_MESSAGE_STORAGE_KEY = 'lxp.session-timeout-message';

export type RuntimeConfig = {
  registrationEnabled: boolean;
  forgotPasswordEnabled: boolean;
  gatewayOnline: boolean;
  supportedProviders: Array<{ providerId: string; displayName: string }>;
};

export type SessionUser = {
  userUuid: string;
  email: string;
  displayName: string;
  status: string;
  roles: string[];
};

export type GatewayChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type GatewayChatResponse = {
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
};

export type GatewayChatStreamChunk = {
  requestId?: string;
  reasoningDelta?: string;
  contentDelta?: string;
  finishReason?: string | null;
};

export type GatewayChatStreamResult = {
  requestId?: string;
  receivedReasoning: boolean;
  receivedContent: boolean;
  finishReason?: string | null;
};

export type ProviderModelSummary = {
  id: string;
  displayName: string;
};

export type ProviderCredentialSummary = {
  id: string;
  userUuid: string;
  providerId: string;
  providerDisplayName: string;
  label: string;
  maskedHint: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type ProviderSettingsSummary = {
  userUuid: string;
  defaultProviderId: string | null;
  defaultModel: string | null;
};

export type AdminUserSummary = {
  userUuid: string;
  displayName: string;
  email: string;
  status: 'active' | 'disabled';
  roles: string[];
  createdAt: string;
  updatedAt: string;
};

export type ChatTransferConversation = {
  id: string;
  title: string;
  model: string;
  providerId: string;
  systemPrompt?: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    reasoning?: string;
    createdAt: string;
  }>;
  updatedAt: string;
};

async function request<T>(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  return requestWithSessionRefresh<T>(url, init, false);
}

async function requestWithSessionRefresh<T>(
  url: string,
  init: (RequestInit & { timeoutMs?: number }) | undefined,
  hasRetried: boolean,
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 30000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
      signal: init?.signal ?? controller.signal,
    }).finally(() => window.clearTimeout(timeoutId));

    if (response.status === 204) {
      return undefined as T;
    }

    if (!response.ok) {
      if (shouldAttemptSessionRefresh(response.status, hasRetried)) {
        await refreshBrowserSession();
        return requestWithSessionRefresh(url, init, true);
      }

      const body = await response.text();
      throw new Error(body || `Request failed with ${response.status}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The request timed out before the gateway returned a response.');
    }

    throw error;
  }
}

async function refreshBrowserSession(): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const response = await fetch(`${adminApiUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const body = await response.text();
      const errorMessage = body || `Session refresh failed with ${response.status}`;
      handleSessionRefreshFailure(errorMessage);
      throw new Error(errorMessage);
    }
  })();

  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function handleSessionRefreshFailure(message: string): void {
  const normalizedMessage = message.toLowerCase();
  const isTimeout =
    normalizedMessage.includes('refresh token is required') ||
    normalizedMessage.includes('invalid or expired token');

  if (!isTimeout || typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(
    SESSION_TIMEOUT_MESSAGE_STORAGE_KEY,
    'Session is timed out, you have to login again.',
  );

  const loginUrl = new URL('/login', window.location.origin);
  window.location.assign(loginUrl.toString());
}

async function requestBlobWithSessionRefresh(
  url: string,
  init: RequestInit | undefined,
  hasRetried: boolean,
): Promise<{ blob: Blob; fileName: string | null }> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
  });

  if (!response.ok) {
    if (shouldAttemptSessionRefresh(response.status, hasRetried)) {
      await refreshBrowserSession();
      return requestBlobWithSessionRefresh(url, init, true);
    }

    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return {
    blob: await response.blob(),
    fileName: extractContentDispositionFileName(response.headers.get('content-disposition')),
  };
}

async function uploadFileWithSessionRefresh<T>(
  url: string,
  file: File,
  hasRetried: boolean,
): Promise<T> {
  const formData = new FormData();
  formData.set('file', file);

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    if (shouldAttemptSessionRefresh(response.status, hasRetried)) {
      await refreshBrowserSession();
      return uploadFileWithSessionRefresh<T>(url, file, true);
    }

    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function extractContentDispositionFileName(headerValue: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const standardMatch = headerValue.match(/filename="([^"]+)"/i);
  return standardMatch?.[1] ?? null;
}

function parseServerSentEventBlock(block: string): string | null {
  const dataLines = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).replace(/^ /, ''));

  if (!dataLines.length) {
    return null;
  }

  return dataLines.join('\n');
}

export const adminApiClient = {
  async getRuntimeConfig(): Promise<RuntimeConfig> {
    try {
      return await request<RuntimeConfig>(`${adminApiUrl}/api/v1/public/runtime-config`);
    } catch {
      return {
        registrationEnabled: false,
        forgotPasswordEnabled: false,
        gatewayOnline: true,
        supportedProviders: [{ providerId: 'nanogpt', displayName: 'NanoGPT' }],
      };
    }
  },

  async getSession(): Promise<SessionUser | null> {
    const response = await fetch(`${adminApiUrl}/api/v1/auth/me`, {
      credentials: 'include',
    });

    if (response.status === 401) {
      try {
        await refreshBrowserSession();
      } catch {
        return null;
      }

      const retryResponse = await fetch(`${adminApiUrl}/api/v1/auth/me`, {
        credentials: 'include',
      });

      if (retryResponse.status === 401) {
        return null;
      }

      if (!retryResponse.ok) {
        throw new Error(`Session request failed with ${retryResponse.status}`);
      }

      return retryResponse.json() as Promise<SessionUser>;
    }

    if (!response.ok) {
      throw new Error(`Session request failed with ${response.status}`);
    }

    return response.json() as Promise<SessionUser>;
  },

  async login(payload: { email: string; password: string }): Promise<SessionUser | null> {
    await request(`${adminApiUrl}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return this.getSession();
  },

  async logout(): Promise<void> {
    await request(`${adminApiUrl}/api/v1/auth/logout`, {
      method: 'POST',
    });
  },

  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>(`${adminApiUrl}/api/v1/health`);
  },

  async getUsers(): Promise<AdminUserSummary[]> {
    return request<AdminUserSummary[]>(`${adminApiUrl}/api/v1/admin/users`);
  },

  async updateUser(
    userUuid: string,
    payload: {
      displayName?: string;
      status?: 'active' | 'disabled';
      roles?: string[];
    },
  ): Promise<AdminUserSummary> {
    return request<AdminUserSummary>(`${adminApiUrl}/api/v1/admin/users/${userUuid}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getOwnProviderCredentials(): Promise<ProviderCredentialSummary[]> {
    return request<ProviderCredentialSummary[]>(`${adminApiUrl}/api/v1/provider-credentials`);
  },

  async updateOwnProviderCredential(
    credentialId: string,
    payload: {
      label?: string;
      apiToken?: string;
    },
  ): Promise<ProviderCredentialSummary> {
    return request<ProviderCredentialSummary>(
      `${adminApiUrl}/api/v1/provider-credentials/${credentialId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async createOwnProviderCredential(payload: {
    providerId: 'nanogpt';
    label: string;
    apiToken: string;
  }): Promise<ProviderCredentialSummary> {
    return request<ProviderCredentialSummary>(`${adminApiUrl}/api/v1/provider-credentials`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getOwnProviderSettings(): Promise<ProviderSettingsSummary> {
    return request<ProviderSettingsSummary>(`${adminApiUrl}/api/v1/provider-settings`);
  },

  async updateOwnProviderSettings(payload: {
    defaultProviderId?: 'nanogpt' | null;
    defaultModel?: string | null;
  }): Promise<ProviderSettingsSummary> {
    return request<ProviderSettingsSummary>(`${adminApiUrl}/api/v1/provider-settings`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getUserProviderCredentials(userUuid: string): Promise<ProviderCredentialSummary[]> {
    return request<ProviderCredentialSummary[]>(
      `${adminApiUrl}/api/v1/admin/users/${userUuid}/provider-credentials`,
    );
  },

  async exportConversation(conversation: ChatTransferConversation): Promise<{
    blob: Blob;
    fileName: string | null;
  }> {
    return requestBlobWithSessionRefresh(
      `${adminApiUrl}/api/v1/chat-transfers/export/conversation`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation }),
      },
      false,
    );
  },

  async exportConversationArchive(conversations: ChatTransferConversation[]): Promise<{
    blob: Blob;
    fileName: string | null;
  }> {
    return requestBlobWithSessionRefresh(
      `${adminApiUrl}/api/v1/chat-transfers/export/archive`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversations }),
      },
      false,
    );
  },

  async importConversationFile(file: File): Promise<{
    conversations: ChatTransferConversation[];
  }> {
    return uploadFileWithSessionRefresh(
      `${adminApiUrl}/api/v1/chat-transfers/import`,
      file,
      false,
    );
  },
};

async function chatStreamWithSessionRefresh(
  payload: {
    providerId?: string;
    model?: string;
    stream: true;
    messages: GatewayChatMessage[];
  },
  handlers: {
    onChunk: (chunk: GatewayChatStreamChunk) => void;
  },
  hasRetried: boolean,
): Promise<GatewayChatStreamResult> {
  const controller = new AbortController();
  let idleTimeoutId: number | undefined;
  const resetIdleTimeout = () => {
    if (idleTimeoutId) {
      window.clearTimeout(idleTimeoutId);
    }

    idleTimeoutId = window.setTimeout(() => controller.abort(), DEFAULT_STREAM_IDLE_TIMEOUT_MS);
  };

  resetIdleTimeout();

  const response = await fetch(`${gatewayApiUrl}/api/v1/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  });

  if (!response.ok) {
    if (shouldAttemptSessionRefresh(response.status, hasRetried)) {
      await refreshBrowserSession();
      return chatStreamWithSessionRefresh(payload, handlers, true);
    }

    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  if (!response.body) {
    throw new Error('The gateway stream did not include a response body.');
  }

  const requestId = response.headers.get('x-request-id') ?? undefined;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let receivedReasoning = false;
  let receivedContent = false;
  let finishReason: string | null | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const finalData = parseServerSentEventBlock(buffer);
        if (finalData && finalData !== '[DONE]') {
          const parsed = JSON.parse(finalData) as {
            choices?: Array<{
              delta?: {
                reasoning?: string;
                content?: string;
              };
              finish_reason?: string | null;
            }>;
          };

          const choice = parsed.choices?.[0];
          const delta = choice?.delta;
          finishReason = choice?.finish_reason ?? finishReason;
          receivedReasoning ||= Boolean(delta?.reasoning);
          receivedContent ||= Boolean(delta?.content);

          handlers.onChunk({
            requestId,
            reasoningDelta: delta?.reasoning,
            contentDelta: delta?.content,
            finishReason: choice?.finish_reason,
          });
        }
        break;
      }

      resetIdleTimeout();
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const data = parseServerSentEventBlock(part);
        if (!data || data === '[DONE]') {
          continue;
        }

        const parsed = JSON.parse(data) as {
          choices?: Array<{
            delta?: {
              reasoning?: string;
              content?: string;
            };
            finish_reason?: string | null;
          }>;
        };

        const choice = parsed.choices?.[0];
        const delta = choice?.delta;
        finishReason = choice?.finish_reason ?? finishReason;
        receivedReasoning ||= Boolean(delta?.reasoning);
        receivedContent ||= Boolean(delta?.content);

        handlers.onChunk({
          requestId,
          reasoningDelta: delta?.reasoning,
          contentDelta: delta?.content,
          finishReason: choice?.finish_reason,
        });
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        `The gateway stream went idle for more than ${DEFAULT_STREAM_IDLE_TIMEOUT_MS / 1000} seconds.`,
      );
    }

    throw error;
  } finally {
    if (idleTimeoutId) {
      window.clearTimeout(idleTimeoutId);
    }
  }

  return {
    requestId,
    receivedReasoning,
    receivedContent,
    finishReason,
  };
}

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

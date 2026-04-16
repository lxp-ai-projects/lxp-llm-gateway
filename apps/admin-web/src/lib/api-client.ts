const adminApiUrl = import.meta.env.VITE_ADMIN_API_URL ?? 'http://localhost:3002';
const gatewayApiUrl = import.meta.env.VITE_GATEWAY_API_URL ?? 'http://localhost:3001';

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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
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
      return null;
    }

    if (!response.ok) {
      throw new Error(`Session request failed with ${response.status}`);
    }

    return response.json() as Promise<SessionUser>;
  },

  async login(payload: { email: string; password: string }): Promise<void> {
    await request(`${adminApiUrl}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<void> {
    await request(`${adminApiUrl}/api/v1/auth/logout`, {
      method: 'POST',
    });
  },

  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>(`${adminApiUrl}/api/v1/health`);
  },
};

export const gatewayApiClient = {
  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>(`${gatewayApiUrl}/api/v1/health`);
  },

  async chat(payload: {
    providerId: string;
    model: string;
    stream: false;
    messages: GatewayChatMessage[];
  }): Promise<GatewayChatResponse> {
    return request<GatewayChatResponse>(`${gatewayApiUrl}/api/v1/chat`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

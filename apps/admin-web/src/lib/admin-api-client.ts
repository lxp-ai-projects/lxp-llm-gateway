import {
  adminApiUrl,
  refreshBrowserSession,
  request,
  requestBlobWithSessionRefresh,
  uploadFileWithSessionRefresh,
} from './api-base';
import type {
  AdminCreateUserInput,
  AdminUserSummary,
  ChatTransferConversation,
  ProviderCredentialSummary,
  ProviderSettingsSummary,
  RuntimeConfig,
  SessionUser,
} from './api-client.types';

export const adminApiClient = {
  async getRuntimeConfig(): Promise<RuntimeConfig> {
    try {
      return await request<RuntimeConfig>(
        `${adminApiUrl}/api/v1/public/runtime-config`,
      );
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

  async login(payload: {
    email: string;
    password: string;
  }): Promise<SessionUser | null> {
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

  async createUser(payload: AdminCreateUserInput): Promise<AdminUserSummary> {
    return request<AdminUserSummary>(`${adminApiUrl}/api/v1/admin/users`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(
    userUuid: string,
    payload: {
      displayName?: string;
      status?: 'active' | 'disabled';
      roles?: string[];
    },
  ): Promise<AdminUserSummary> {
    return request<AdminUserSummary>(
      `${adminApiUrl}/api/v1/admin/users/${userUuid}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async getOwnProviderCredentials(): Promise<ProviderCredentialSummary[]> {
    return request<ProviderCredentialSummary[]>(
      `${adminApiUrl}/api/v1/provider-credentials`,
    );
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
    return request<ProviderCredentialSummary>(
      `${adminApiUrl}/api/v1/provider-credentials`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async getOwnProviderSettings(): Promise<ProviderSettingsSummary> {
    return request<ProviderSettingsSummary>(
      `${adminApiUrl}/api/v1/provider-settings`,
    );
  },

  async updateOwnProviderSettings(payload: {
    defaultProviderId?: 'nanogpt' | null;
    defaultModel?: string | null;
  }): Promise<ProviderSettingsSummary> {
    return request<ProviderSettingsSummary>(
      `${adminApiUrl}/api/v1/provider-settings`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async getUserProviderCredentials(
    userUuid: string,
  ): Promise<ProviderCredentialSummary[]> {
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

  async exportConversationArchive(
    conversations: ChatTransferConversation[],
  ): Promise<{
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

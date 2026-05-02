import {
  adminApiUrl,
  refreshBrowserSession,
  request,
  requestBlobWithSessionRefresh,
  uploadFileWithSessionRefresh,
} from './api-base';
import type {
  AdminCreateTenantInput,
  AdminCreateTenantMembershipInput,
  AdminCreateUserInput,
  AdminTenantMembershipSummary,
  AdminTenantSummary,
  AdminUpdateGlobalRolesInput,
  AdminUpdateTenantInput,
  AdminUserSummary,
  AdminUpdateUserInput,
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
        supportedProviders: [
          { providerId: 'nanogpt', displayName: 'NanoGPT' },
          { providerId: 'openrouter', displayName: 'OpenRouter' },
          { providerId: 'ollama', displayName: 'Ollama' },
          { providerId: 'groq', displayName: 'Groq' },
          { providerId: 'google', displayName: 'Google Gemini' },
          { providerId: 'xai', displayName: 'xAI Grok' },
          { providerId: 'openai', displayName: 'OpenAI' },
          { providerId: 'anthropic', displayName: 'Anthropic Claude' },
        ],
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

  async switchActiveTenant(tenantId: string): Promise<SessionUser> {
    return request<SessionUser>(`${adminApiUrl}/api/v1/auth/active-tenant`, {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    });
  },

  async getHealth(): Promise<{ status: string }> {
    return request<{ status: string }>(`${adminApiUrl}/api/v1/health`);
  },

  async getUsers(): Promise<AdminUserSummary[]> {
    return request<AdminUserSummary[]>(`${adminApiUrl}/api/v1/admin/users`);
  },

  async getTenants(): Promise<AdminTenantSummary[]> {
    return request<AdminTenantSummary[]>(`${adminApiUrl}/api/v1/admin/tenants`);
  },

  async createTenant(
    payload: AdminCreateTenantInput,
  ): Promise<AdminTenantSummary> {
    return request<AdminTenantSummary>(`${adminApiUrl}/api/v1/admin/tenants`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateTenant(
    tenantId: string,
    payload: AdminUpdateTenantInput,
  ): Promise<AdminTenantSummary> {
    return request<AdminTenantSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async getTenantMemberships(
    tenantId: string,
  ): Promise<AdminTenantMembershipSummary[]> {
    return request<AdminTenantMembershipSummary[]>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/memberships`,
    );
  },

  async createTenantUser(
    tenantId: string,
    payload: AdminCreateTenantMembershipInput,
  ): Promise<AdminUserSummary> {
    return request<AdminUserSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/users`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async updateTenantUser(
    tenantId: string,
    userUuid: string,
    payload: AdminUpdateUserInput,
  ): Promise<AdminUserSummary> {
    return request<AdminUserSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/users/${userUuid}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async updateUserGlobalRoles(
    userUuid: string,
    payload: AdminUpdateGlobalRolesInput,
  ): Promise<{ userUuid: string; globalRoles: string[] }> {
    return request<{ userUuid: string; globalRoles: string[] }>(
      `${adminApiUrl}/api/v1/admin/users/${userUuid}/global-roles`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async createUser(payload: AdminCreateUserInput): Promise<AdminUserSummary> {
    return request<AdminUserSummary>(`${adminApiUrl}/api/v1/admin/users`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(
    userUuid: string,
    payload: AdminUpdateUserInput,
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
      baseUrl?: string;
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
    providerId: string;
    label: string;
    apiToken?: string;
    baseUrl?: string;
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
    defaultProviderId?: string | null;
    defaultModel?: string | null;
    defaultImageProviderId?: string | null;
    defaultImageModel?: string | null;
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

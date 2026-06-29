import {
  adminApiUrl,
  refreshBrowserSession,
  request,
  requestBlobWithSessionRefresh,
  uploadFileWithSessionRefresh,
} from './api-base';
import { SUPPORTED_PROVIDERS } from '@lxp/domain';
import type {
  AdminCreateTenantInput,
  AdminCreateIntegrationApiKeyInput,
  AdminCreateIntegrationClientInput,
  AdminCreateTenantModelAccessRuleInput,
  AdminCreateTenantMembershipInput,
  AdminCreateUserInput,
  AdminTenantIntegrationApiKeySecretSummary,
  AdminTenantIntegrationApiKeySummary,
  AdminTenantIntegrationClientSummary,
  AdminTenantMembershipSummary,
  AdminTenantModelAccessRuleSummary,
  AdminTenantPolicySummary,
  AdminTenantProviderConfigurationSummary,
  AdminTenantProviderConfigurationTestResult,
  AdminTenantSummary,
  AdminTenantUsageByModelSummary,
  AdminTenantUsageByProviderSummary,
  AdminTenantUsageEventSummary,
  AdminTenantUsageSummary,
  AdminTestTenantProviderConfigurationInput,
  AdminUpdateGlobalRolesInput,
  AdminUpdateTenantInput,
  AdminUpdateIntegrationApiKeyInput,
  AdminUpdateIntegrationClientInput,
  AdminUpdateTenantModelAccessRuleInput,
  AdminUpdateTenantPolicyInput,
  AdminUpdateTenantProviderConfigurationInput,
  AdminUserSummary,
  AdminUpdateUserInput,
  ChatTransferConversation,
  GatewayImageCatalogResponse,
  GatewayVideoCatalogResponse,
  ProviderCredentialSummary,
  ProviderModelSummary,
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
        supportedProviders: [...SUPPORTED_PROVIDERS],
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
      skipSessionRefresh: true,
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

  async getTenantUsage(
    tenantId: string,
  ): Promise<AdminTenantUsageEventSummary[]> {
    return request<AdminTenantUsageEventSummary[]>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/usage`,
    );
  },

  async getTenantUsageSummary(
    tenantId: string,
  ): Promise<AdminTenantUsageSummary> {
    return request<AdminTenantUsageSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/usage/summary`,
    );
  },

  async getTenantUsageByProvider(
    tenantId: string,
  ): Promise<AdminTenantUsageByProviderSummary[]> {
    return request<AdminTenantUsageByProviderSummary[]>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/usage/by-provider`,
    );
  },

  async getTenantUsageByModel(
    tenantId: string,
  ): Promise<AdminTenantUsageByModelSummary[]> {
    return request<AdminTenantUsageByModelSummary[]>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/usage/by-model`,
    );
  },

  async getTenantProviderConfigurations(
    tenantId: string,
  ): Promise<AdminTenantProviderConfigurationSummary[]> {
    return request<AdminTenantProviderConfigurationSummary[]>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/provider-configurations`,
    );
  },

  async getTenantPolicy(tenantId: string): Promise<AdminTenantPolicySummary> {
    return request<AdminTenantPolicySummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/policies`,
    );
  },

  async updateTenantPolicy(
    tenantId: string,
    payload: AdminUpdateTenantPolicyInput,
  ): Promise<AdminTenantPolicySummary> {
    return request<AdminTenantPolicySummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/policies`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  async getTenantIntegrationClients(
    tenantId: string,
  ): Promise<AdminTenantIntegrationClientSummary[]> {
    return request<AdminTenantIntegrationClientSummary[]>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/integration-clients`,
    );
  },

  async createTenantIntegrationClient(
    tenantId: string,
    payload: AdminCreateIntegrationClientInput,
  ): Promise<AdminTenantIntegrationClientSummary> {
    return request<AdminTenantIntegrationClientSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/integration-clients`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async updateTenantIntegrationClient(
    tenantId: string,
    integrationClientId: string,
    payload: AdminUpdateIntegrationClientInput,
  ): Promise<AdminTenantIntegrationClientSummary> {
    return request<AdminTenantIntegrationClientSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/integration-clients/${integrationClientId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async getTenantIntegrationApiKeys(
    tenantId: string,
    integrationClientId: string,
  ): Promise<AdminTenantIntegrationApiKeySummary[]> {
    return request<AdminTenantIntegrationApiKeySummary[]>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/integration-clients/${integrationClientId}/api-keys`,
    );
  },

  async createTenantIntegrationApiKey(
    tenantId: string,
    integrationClientId: string,
    payload: AdminCreateIntegrationApiKeyInput,
  ): Promise<AdminTenantIntegrationApiKeySecretSummary> {
    return request<AdminTenantIntegrationApiKeySecretSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/integration-clients/${integrationClientId}/api-keys`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async rotateTenantIntegrationApiKey(
    tenantId: string,
    integrationClientId: string,
    apiKeyId: string,
  ): Promise<AdminTenantIntegrationApiKeySecretSummary> {
    return request<AdminTenantIntegrationApiKeySecretSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/integration-clients/${integrationClientId}/api-keys/${apiKeyId}/rotate`,
      {
        method: 'POST',
      },
    );
  },

  async updateTenantIntegrationApiKey(
    tenantId: string,
    integrationClientId: string,
    apiKeyId: string,
    payload: AdminUpdateIntegrationApiKeyInput,
  ): Promise<AdminTenantIntegrationApiKeySummary> {
    return request<AdminTenantIntegrationApiKeySummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/integration-clients/${integrationClientId}/api-keys/${apiKeyId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
  },

  async updateTenantProviderConfiguration(
    tenantId: string,
    providerId: string,
    payload: AdminUpdateTenantProviderConfigurationInput,
  ): Promise<AdminTenantProviderConfigurationSummary> {
    return request<AdminTenantProviderConfigurationSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/provider-configurations/${providerId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  async testTenantProviderConfiguration(
    tenantId: string,
    providerId: string,
    payload: AdminTestTenantProviderConfigurationInput = {},
  ): Promise<AdminTenantProviderConfigurationTestResult> {
    return request<AdminTenantProviderConfigurationTestResult>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/provider-configurations/${providerId}/test`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async getTenantModelAccessRules(
    tenantId: string,
  ): Promise<AdminTenantModelAccessRuleSummary[]> {
    return request<AdminTenantModelAccessRuleSummary[]>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/model-access-rules`,
    );
  },

  async createTenantModelAccessRule(
    tenantId: string,
    payload: AdminCreateTenantModelAccessRuleInput,
  ): Promise<AdminTenantModelAccessRuleSummary> {
    return request<AdminTenantModelAccessRuleSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/model-access-rules`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async updateTenantModelAccessRule(
    tenantId: string,
    ruleId: string,
    payload: AdminUpdateTenantModelAccessRuleInput,
  ): Promise<AdminTenantModelAccessRuleSummary> {
    return request<AdminTenantModelAccessRuleSummary>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/model-access-rules/${ruleId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  async deleteTenantModelAccessRule(
    tenantId: string,
    ruleId: string,
  ): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(
      `${adminApiUrl}/api/v1/admin/tenants/${tenantId}/model-access-rules/${ruleId}`,
      {
        method: 'DELETE',
      },
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

  async deleteOwnProviderCredential(
    credentialId: string,
  ): Promise<{ deleted: true }> {
    return request<{ deleted: true }>(
      `${adminApiUrl}/api/v1/provider-credentials/${credentialId}`,
      {
        method: 'DELETE',
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

  async getOwnModels(providerId = 'nanogpt'): Promise<{
    providerId: string;
    models: ProviderModelSummary[];
  }> {
    const endpoint = providerId
      ? `${adminApiUrl}/api/v1/models?providerId=${encodeURIComponent(providerId)}`
      : `${adminApiUrl}/api/v1/models`;

    return request(endpoint);
  },

  async getOwnImageCatalog(): Promise<GatewayImageCatalogResponse> {
    return request(`${adminApiUrl}/api/v1/images/catalog`);
  },

  async getOwnVideoCatalog(): Promise<GatewayVideoCatalogResponse> {
    return request(`${adminApiUrl}/api/v1/videos/catalog`);
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

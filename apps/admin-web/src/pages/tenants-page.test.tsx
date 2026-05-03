import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { TenantsPage } from './tenants-page';

const { useTenantsControllerMock } = vi.hoisted(() => ({
  useTenantsControllerMock: vi.fn(),
}));

vi.mock('../features/tenants/hooks/use-tenants-controller', () => ({
  useTenantsController: useTenantsControllerMock,
}));

function createController(overrides: Record<string, unknown> = {}) {
  const integrationClient = {
    id: 'integration-client-1',
    tenantId: 'tenant-1',
    clientId: 'open-webui-demo',
    displayName: 'Open WebUI Demo',
    applicationId: 'open-webui',
    defaultUserUuid: 'user-1',
    defaultUserDisplayName: 'Patrick',
    scopes: ['chat:completion', 'models:list'],
    trustedForwardedIdentityEnabled: true,
    status: 'active' as const,
    apiKeyCount: 1,
    createdAt: '2026-05-02T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
  };
  const apiKey = {
    id: 'api-key-1',
    tenantId: 'tenant-1',
    integrationClientId: 'integration-client-1',
    integrationClientClientId: 'open-webui-demo',
    label: 'Primary key',
    keyHint: 'lxp_...abcd',
    scopes: ['chat:completion'],
    status: 'active' as const,
    expiresAt: null,
    lastUsedAt: null,
    createdAt: '2026-05-02T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
  };

  return {
    createAllowOverride: true,
    createDisplayName: '',
    createMemberDisplayName: '',
    createMemberEmail: '',
    createMemberOpened: false,
    createMemberPassword: '',
    createMemberRoles: ['user'],
    createOpened: false,
    createSlug: '',
    editAllowOverride: true,
    editDisplayName: 'Tenant One',
    editGlobalRoles: [],
    editGlobalRolesOpened: false,
    editIntegrationApiKeyExpiresAt: '',
    editIntegrationApiKeyLabel: '',
    editIntegrationApiKeyOpened: false,
    editIntegrationApiKeyScopes: [],
    editIntegrationApiKeyStatus: 'active',
    editIntegrationClientApplicationId: '',
    editIntegrationClientDefaultUserUuid: '',
    editIntegrationClientDisplayName: '',
    editIntegrationClientId: '',
    editIntegrationClientOpened: false,
    editIntegrationClientScopes: ['chat:completion'],
    editIntegrationClientStatus: 'active',
    editIntegrationClientTrustedForwardedIdentityEnabled: false,
    editMemberOpened: false,
    editMemberRoles: ['user'],
    editMemberStatus: 'active',
    editModelAccessRuleOpened: false,
    editModelRuleCapability: 'text',
    editModelRuleEffect: 'allow',
    editModelRuleMaxImagesPerRequest: '',
    editModelRuleMaxInputTokens: '',
    editModelRuleMaxOutputTokens: '',
    editModelRuleMaxResolution: '',
    editModelRulePattern: '*',
    editModelRulePriority: '100',
    editModelRuleProviderId: 'nanogpt',
    editPolicyAllowPromptLogging: false,
    editPolicyAllowResponseLogging: false,
    editPolicyDailyRequestLimit: '',
    editPolicyImageRequestsPerMonth: '',
    editPolicyMaxInputTokens: '',
    editPolicyMaxOutputTokens: '',
    editPolicyMonthlyBudgetUsd: '',
    editPolicyMonthlyRequestLimit: '',
    editPolicyMonthlyTokenLimit: '',
    editPolicyRequestsPerMinute: '60',
    editPolicyRetentionDays: '30',
    editPolicyTokensPerMinute: '100000',
    editProviderAllowPlatformFallback: false,
    editProviderAllowTenantFallback: true,
    editProviderConfigurationOpened: false,
    editProviderCredentialMode: 'hybrid',
    editProviderDefaultImageModel: '',
    editProviderDefaultTextModel: '',
    editProviderEnabled: true,
    editProviderPreferUserCredentials: true,
    editStatus: 'active',
    handleCreateTenantSubmit: vi.fn(),
    handleCreateTenantUserSubmit: vi.fn(),
    handleDeleteTenantModelAccessRule: vi.fn(),
    handleRotateTenantIntegrationApiKey: vi.fn(),
    handleTestTenantProviderConfiguration: vi.fn(),
    handleUpdateGlobalRolesSubmit: vi.fn(),
    handleUpdateTenantPolicySubmit: vi.fn(),
    handleUpdateTenantProviderConfigurationSubmit: vi.fn(),
    handleUpdateTenantSubmit: vi.fn(),
    handleUpdateTenantUserSubmit: vi.fn(),
    handleUpsertTenantIntegrationApiKeySubmit: vi.fn(),
    handleUpsertTenantIntegrationClientSubmit: vi.fn(),
    handleUpsertTenantModelAccessRuleSubmit: vi.fn(),
    integrationApiKeys: [apiKey],
    integrationApiKeysQuery: { isPending: false },
    integrationClientMemberOptions: [
      { value: 'user-1', label: 'Patrick (patrick@example.com)' },
    ],
    integrationClients: [integrationClient],
    integrationClientsQuery: { isPending: false },
    isCreatePending: false,
    isCreateTenantIntegrationApiKeyPending: false,
    isCreateTenantIntegrationClientPending: false,
    isCreateTenantModelAccessRulePending: false,
    isCreateTenantUserPending: false,
    isDeleteTenantModelAccessRulePending: false,
    isRotateTenantIntegrationApiKeyPending: false,
    isTestTenantProviderConfigurationPending: false,
    isUpdateGlobalRolesPending: false,
    isUpdatePending: false,
    isUpdateTenantIntegrationApiKeyPending: false,
    isUpdateTenantIntegrationClientPending: false,
    isUpdateTenantModelAccessRulePending: false,
    isUpdateTenantPolicyPending: false,
    isUpdateTenantProviderConfigurationPending: false,
    isUpdateTenantUserPending: false,
    memberships: [],
    membershipsQuery: { isPending: false },
    modelAccessRules: [],
    modelAccessRulesQuery: { isPending: false },
    onCloseCreate: vi.fn(),
    onCloseCreateMember: vi.fn(),
    onCloseEditGlobalRoles: vi.fn(),
    onCloseEditIntegrationApiKey: vi.fn(),
    onCloseEditIntegrationClient: vi.fn(),
    onCloseEditMember: vi.fn(),
    onCloseEditModelAccessRule: vi.fn(),
    onCloseEditProviderConfiguration: vi.fn(),
    onCreateAllowOverrideChange: vi.fn(),
    onCreateDisplayNameChange: vi.fn(),
    onCreateMemberDisplayNameChange: vi.fn(),
    onCreateMemberEmailChange: vi.fn(),
    onCreateMemberPasswordChange: vi.fn(),
    onCreateMemberRolesChange: vi.fn(),
    onCreateSlugChange: vi.fn(),
    onDismissRevealedIntegrationApiKey: vi.fn(),
    onEditAllowOverrideChange: vi.fn(),
    onEditDisplayNameChange: vi.fn(),
    onEditGlobalRolesChange: vi.fn(),
    onEditIntegrationApiKeyExpiresAtChange: vi.fn(),
    onEditIntegrationApiKeyLabelChange: vi.fn(),
    onEditIntegrationApiKeyScopesChange: vi.fn(),
    onEditIntegrationApiKeyStatusChange: vi.fn(),
    onEditIntegrationClientApplicationIdChange: vi.fn(),
    onEditIntegrationClientDefaultUserUuidChange: vi.fn(),
    onEditIntegrationClientDisplayNameChange: vi.fn(),
    onEditIntegrationClientIdChange: vi.fn(),
    onEditIntegrationClientScopesChange: vi.fn(),
    onEditIntegrationClientStatusChange: vi.fn(),
    onEditIntegrationClientTrustedForwardedIdentityEnabledChange: vi.fn(),
    onEditMemberRolesChange: vi.fn(),
    onEditMemberStatusChange: vi.fn(),
    onEditModelRuleCapabilityChange: vi.fn(),
    onEditModelRuleEffectChange: vi.fn(),
    onEditModelRuleMaxImagesPerRequestChange: vi.fn(),
    onEditModelRuleMaxInputTokensChange: vi.fn(),
    onEditModelRuleMaxOutputTokensChange: vi.fn(),
    onEditModelRuleMaxResolutionChange: vi.fn(),
    onEditModelRulePatternChange: vi.fn(),
    onEditModelRulePriorityChange: vi.fn(),
    onEditModelRuleProviderIdChange: vi.fn(),
    onEditPolicyAllowPromptLoggingChange: vi.fn(),
    onEditPolicyAllowResponseLoggingChange: vi.fn(),
    onEditPolicyDailyRequestLimitChange: vi.fn(),
    onEditPolicyImageRequestsPerMonthChange: vi.fn(),
    onEditPolicyMaxInputTokensChange: vi.fn(),
    onEditPolicyMaxOutputTokensChange: vi.fn(),
    onEditPolicyMonthlyBudgetUsdChange: vi.fn(),
    onEditPolicyMonthlyRequestLimitChange: vi.fn(),
    onEditPolicyMonthlyTokenLimitChange: vi.fn(),
    onEditPolicyRequestsPerMinuteChange: vi.fn(),
    onEditPolicyRetentionDaysChange: vi.fn(),
    onEditPolicyTokensPerMinuteChange: vi.fn(),
    onEditProviderAllowPlatformFallbackChange: vi.fn(),
    onEditProviderAllowTenantFallbackChange: vi.fn(),
    onEditProviderCredentialModeChange: vi.fn(),
    onEditProviderDefaultImageModelChange: vi.fn(),
    onEditProviderDefaultTextModelChange: vi.fn(),
    onEditProviderEnabledChange: vi.fn(),
    onEditProviderPreferUserCredentialsChange: vi.fn(),
    onEditStatusChange: vi.fn(),
    onOpenCreate: vi.fn(),
    onOpenCreateIntegrationApiKey: vi.fn(),
    onOpenCreateIntegrationClient: vi.fn(),
    onOpenCreateMember: vi.fn(),
    onOpenCreateModelAccessRule: vi.fn(),
    onOpenEditGlobalRoles: vi.fn(),
    onOpenEditIntegrationApiKey: vi.fn(),
    onOpenEditIntegrationClient: vi.fn(),
    onOpenEditMember: vi.fn(),
    onOpenEditModelAccessRule: vi.fn(),
    onOpenEditProviderConfiguration: vi.fn(),
    onSelectIntegrationClient: vi.fn(),
    onSelectTenant: vi.fn(),
    providerConfigurations: [],
    providerConfigurationsQuery: { isPending: false },
    revealedIntegrationApiKey: {
      clientDisplayName: 'Open WebUI Demo',
      label: 'Primary key',
      apiKey: 'lxp_super_secret_key',
    },
    selectedIntegrationApiKey: apiKey,
    selectedIntegrationClient: integrationClient,
    selectedMembership: null,
    selectedMembershipIsProtected: false,
    selectedMembershipIsSelf: false,
    selectedModelAccessRule: null,
    selectedProviderConfiguration: null,
    selectedTenant: {
      id: 'tenant-1',
      slug: 'tenant-one',
      displayName: 'Tenant One',
      allowUserCredentialOverride: true,
      status: 'active' as const,
      membershipCount: 1,
      createdAt: '2026-05-02T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    },
    tenantCards: [
      {
        id: 'tenant-1',
        slug: 'tenant-one',
        displayName: 'Tenant One',
        allowUserCredentialOverride: true,
        status: 'active' as const,
        membershipCount: 1,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
    ],
    tenantPolicy: null,
    tenantPolicyQuery: { isPending: false },
    tenantsQuery: { isPending: false },
    testTenantProviderConfigurationResult: null,
    updateGlobalRolesError: null,
    activeTenantLabel: 'Tenant One (tenant-one)',
    ...overrides,
  };
}

beforeEach(() => {
  useTenantsControllerMock.mockReset();
});

function openIntegrationClientsTab() {
  fireEvent.click(screen.getByRole('tab', { name: 'Integration Clients' }));
}

test('TenantsPage renders the integration client surface and revealed api key', () => {
  useTenantsControllerMock.mockReturnValue(createController());

  renderWithProviders(<TenantsPage />);
  openIntegrationClientsTab();

  expect(
    screen.getByRole('heading', { name: 'Integration Clients' }),
  ).toBeInTheDocument();
  expect(screen.getAllByText('Open WebUI Demo').length).toBeGreaterThan(0);
  expect(screen.getAllByText('open-webui-demo').length).toBeGreaterThan(0);
  expect(screen.getByText('Copy this API key now')).toBeInTheDocument();
  expect(screen.getByText('lxp_super_secret_key')).toBeInTheDocument();
  expect(
    screen.getByText('API keys for Open WebUI Demo'),
  ).toBeInTheDocument();
  expect(screen.getAllByText('Primary key').length).toBeGreaterThan(0);
});

test('TenantsPage forwards integration client and api key actions', () => {
  const controller = createController();
  useTenantsControllerMock.mockReturnValue(controller);

  renderWithProviders(<TenantsPage />);
  openIntegrationClientsTab();

  fireEvent.click(screen.getByRole('button', { name: 'Add client' }));
  expect(controller.onOpenCreateIntegrationClient).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getAllByRole('button', { name: 'Create key' })[0]!);
  expect(controller.onOpenCreateIntegrationApiKey).toHaveBeenCalledWith(
    controller.selectedIntegrationClient,
  );

  const keySection = screen
    .getByText('API keys for Open WebUI Demo')
    .closest('div');
  expect(keySection).not.toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Edit client' }));
  expect(controller.onOpenEditIntegrationClient).toHaveBeenCalledWith(
    controller.selectedIntegrationClient,
  );
});

test('TenantsPage shows the api key modal and rotates the selected key', () => {
  const controller = createController({
    editIntegrationApiKeyOpened: true,
  });
  useTenantsControllerMock.mockReturnValue(controller);

  renderWithProviders(<TenantsPage />);

  const dialog = screen.getByRole('dialog', { name: 'Edit API key' });
  expect(
    within(dialog).getByText('Rotation'),
  ).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate key' }));
  expect(controller.handleRotateTenantIntegrationApiKey).toHaveBeenCalledTimes(1);
});

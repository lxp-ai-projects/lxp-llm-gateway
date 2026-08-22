import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
    identityMode: 'FORWARDED_USER_WITH_DEFAULT',
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
    tenantCredentialLabel: '',
    tenantCredentialApiToken: '',
    tenantCredentialBaseUrl: '',
    selectedTenantProviderCredential: null,
    editStatus: 'active',
    handleCreateTenantSubmit: vi.fn(),
    handleCreateTenantUserSubmit: vi.fn(),
    handleDeleteTenantIntegrationApiKey: vi.fn(),
    handleDeleteTenantIntegrationClient: vi.fn(),
    handleDeleteTenantModelAccessRule: vi.fn(),
    handleDeleteTenantProviderCredential: vi.fn(),
    handleSaveTenantProviderCredential: vi.fn(),
    handleToggleTenantProviderCredential: vi.fn(),
    handleRotateTenantIntegrationApiKey: vi.fn(),
    handleTestTenantProviderConfiguration: vi.fn(),
    onTestIntegrationClient: vi.fn(),
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
    isDeleteTenantIntegrationApiKeyPending: false,
    isDeleteTenantIntegrationClientPending: false,
    isDeleteTenantModelAccessRulePending: false,
    isDeleteTenantProviderCredentialPending: false,
    isRotateTenantIntegrationApiKeyPending: false,
    isSaveTenantProviderCredentialPending: false,
    isToggleTenantProviderCredentialPending: false,
    isTestTenantProviderConfigurationPending: false,
    isTestTenantIntegrationClientPending: false,
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
    onTenantCredentialLabelChange: vi.fn(),
    onTenantCredentialApiTokenChange: vi.fn(),
    onTenantCredentialBaseUrlChange: vi.fn(),
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
    testingIntegrationClientId: null,
    testTenantIntegrationClientResult: null,
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
  expect(screen.getByText('API keys for Open WebUI Demo')).toBeInTheDocument();
  expect(screen.getAllByText('Primary key').length).toBeGreaterThan(0);
});

test('TenantsPage forwards integration client and api key actions', async () => {
  const controller = createController();
  useTenantsControllerMock.mockReturnValue(controller);

  renderWithProviders(<TenantsPage />);
  openIntegrationClientsTab();

  fireEvent.click(screen.getByRole('button', { name: 'Add client' }));
  expect(controller.onOpenCreateIntegrationClient).toHaveBeenCalledTimes(1);

  const clientActions = screen.getByRole('button', {
    name: 'Actions for Open WebUI Demo',
  });
  const clickClientAction = async (name: string) => {
    fireEvent.click(clientActions);
    const clientMenuId = clientActions.getAttribute('aria-controls');
    expect(clientMenuId).not.toBeNull();
    const clientMenu = await waitFor(() => {
      const menu = document.getElementById(clientMenuId!);
      expect(menu).not.toBeNull();
      return menu!;
    });
    fireEvent.click(
      within(clientMenu).getByRole('menuitem', { name, hidden: true }),
    );
    await waitFor(() =>
      expect(clientActions).toHaveAttribute('aria-expanded', 'false'),
    );
  };

  await clickClientAction('Create key');
  expect(controller.onOpenCreateIntegrationApiKey).toHaveBeenCalledWith(
    controller.selectedIntegrationClient,
  );

  const keySection = screen
    .getByText('API keys for Open WebUI Demo')
    .closest('div');
  expect(keySection).not.toBeNull();

  await clickClientAction('Edit client');
  expect(controller.onOpenEditIntegrationClient).toHaveBeenCalledWith(
    controller.selectedIntegrationClient,
  );

  await clickClientAction('Test client');
  expect(controller.onTestIntegrationClient).toHaveBeenCalledWith(
    controller.selectedIntegrationClient,
  );

  const keyActions = screen.getByRole('button', {
    name: 'Actions for Primary key',
  });
  fireEvent.click(keyActions);
  const keyMenuId = keyActions.getAttribute('aria-controls');
  expect(keyMenuId).not.toBeNull();
  const keyMenu = await waitFor(() => {
    const menu = document.getElementById(keyMenuId!);
    expect(menu).not.toBeNull();
    return menu!;
  });
  fireEvent.click(
    within(keyMenu).getByRole('menuitem', {
      name: 'Delete key',
      hidden: true,
    }),
  );
  expect(controller.handleDeleteTenantIntegrationApiKey).toHaveBeenCalledWith(
    controller.selectedIntegrationClient,
    controller.selectedIntegrationApiKey,
  );

  await clickClientAction('Delete client');
  expect(controller.handleDeleteTenantIntegrationClient).toHaveBeenCalledWith(
    controller.selectedIntegrationClient,
  );
});

test('TenantsPage explains successful service-only authentication separately from provider readiness', () => {
  useTenantsControllerMock.mockReturnValue(
    createController({
      testTenantIntegrationClientResult: {
        ready: true,
        checkedAt: '2026-08-20T00:00:00.000Z',
        gatewayReachable: true,
        clientId: 'pgs',
        identityMode: 'SERVICE_ONLY',
        principalKind: 'SERVICE',
        scopes: ['evaluation:invoke'],
        message:
          'Gateway authentication succeeded. Provider credentials and model policy are tested separately.',
      },
    }),
  );

  renderWithProviders(<TenantsPage />);
  openIntegrationClientsTab();

  expect(
    screen.getByText('Integration client authentication succeeded'),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Provider credentials and model policy/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Evaluation readiness also requires/),
  ).toBeInTheDocument();
});

test('TenantsPage shows the api key modal and rotates the selected key', () => {
  const controller = createController({
    editIntegrationApiKeyOpened: true,
  });
  useTenantsControllerMock.mockReturnValue(controller);

  renderWithProviders(<TenantsPage />);

  const dialog = screen.getByRole('dialog', { name: 'Edit API key' });
  expect(within(dialog).getByText('Rotation')).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Rotate key' }));
  expect(controller.handleRotateTenantIntegrationApiKey).toHaveBeenCalledTimes(
    1,
  );
});

test('TenantsPage exposes tenant provider credential lifecycle actions', () => {
  const providerConfiguration = {
    id: 'configuration-1',
    tenantId: 'tenant-1',
    providerId: 'openai',
    providerDisplayName: 'OpenAI',
    providerStatus: 'active' as const,
    enabled: true,
    defaultTextModel: 'gpt-4.1',
    defaultImageModel: null,
    credentialMode: 'tenant_byok' as const,
    preferUserCredentials: false,
    allowPlatformFallback: false,
    allowTenantFallback: true,
    createdAt: '2026-05-02T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
  };
  const credential = {
    id: 'credential-1',
    userUuid: null,
    providerId: 'openai',
    providerDisplayName: 'OpenAI',
    label: 'Evaluation',
    scope: 'tenant' as const,
    maskedHint: '***9876',
    isActive: true,
    createdAt: '2026-05-02T00:00:00.000Z',
    updatedAt: '2026-05-02T00:00:00.000Z',
    lastUsedAt: null,
  };
  const controller = createController({
    editProviderConfigurationOpened: true,
    selectedProviderConfiguration: providerConfiguration,
    selectedTenantProviderCredential: credential,
    tenantCredentialLabel: credential.label,
  });
  useTenantsControllerMock.mockReturnValue(controller);

  renderWithProviders(<TenantsPage />);

  expect(screen.getByText(/Hint:.*\*\*\*9876/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Update credential' }));
  expect(controller.handleSaveTenantProviderCredential).toHaveBeenCalledTimes(
    1,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Disable' }));
  expect(controller.handleToggleTenantProviderCredential).toHaveBeenCalledTimes(
    1,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Delete credential' }));
  expect(controller.handleDeleteTenantProviderCredential).toHaveBeenCalledTimes(
    1,
  );
});

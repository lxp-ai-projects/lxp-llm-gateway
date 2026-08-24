import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Grid,
  Group,
  Menu,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  PasswordInput,
} from '@mantine/core';
import { IconChevronDown, IconHelpCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { INTEGRATION_CLIENT_SCOPES } from '@lxp/domain';

import { PageHeader } from '../components/page-header';
import { useTenantsController } from '../features/tenants/hooks/use-tenants-controller';
import { TenantRegistrationPanel } from '../features/tenants/components/tenant-registration-panel';

function HelpTooltip({ text }: { text: string }) {
  const { t } = useTranslation('tenants');
  return (
    <Tooltip label={text} multiline w={280} withArrow>
      <ActionIcon
        aria-label={t('helpTooltip.moreInformation')}
        color="gray"
        radius="xl"
        size="sm"
        variant="subtle"
      >
        <IconHelpCircle size={16} stroke={1.8} />
      </ActionIcon>
    </Tooltip>
  );
}

function SectionTitle({ title, help }: { title: string; help: string }) {
  return (
    <Group gap="xs">
      <Title order={3}>{title}</Title>
      <HelpTooltip text={help} />
    </Group>
  );
}

function FieldLabel({ label, help }: { label: string; help: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text component="span" inherit>
        {label}
      </Text>
      <HelpTooltip text={help} />
    </Group>
  );
}

export function TenantsPage() {
  const { t } = useTranslation('tenants');
  const {
    createAllowOverride,
    createDisplayName,
    editIntegrationApiKeyExpiresAt,
    editIntegrationApiKeyLabel,
    editIntegrationApiKeyOpened,
    editIntegrationApiKeyScopes,
    editIntegrationApiKeyStatus,
    editIntegrationClientApplicationId,
    editIntegrationClientDefaultUserUuid,
    editIntegrationClientDisplayName,
    editIntegrationClientId,
    editIntegrationClientOpened,
    editIntegrationClientScopes,
    editIntegrationClientStatus,
    editIntegrationClientTrustedForwardedIdentityEnabled,
    createMemberDisplayName,
    createMemberEmail,
    createMemberOpened,
    createMemberPassword,
    createMemberRoles,
    createOpened,
    createSlug,
    editGlobalRoles,
    editGlobalRolesOpened,
    editAllowOverride,
    editDisplayName,
    editMemberOpened,
    editMemberRoles,
    editMemberStatus,
    editModelAccessRuleOpened,
    editModelRuleCapability,
    editModelRuleEffect,
    editModelRuleMaxImagesPerRequest,
    editModelRuleMaxInputTokens,
    editModelRuleMaxOutputTokens,
    editModelRuleMaxResolution,
    editModelRulePattern,
    editModelRulePriority,
    editModelRuleProviderId,
    editPolicyAllowPromptLogging,
    editPolicyAllowResponseLogging,
    editPolicyDailyRequestLimit,
    editPolicyImageRequestsPerMonth,
    editPolicyMaxInputTokens,
    editPolicyMaxOutputTokens,
    editPolicyMonthlyBudgetUsd,
    editPolicyMonthlyRequestLimit,
    editPolicyMonthlyTokenLimit,
    editPolicyRequestsPerMinute,
    editPolicyRetentionDays,
    editPolicyTokensPerMinute,
    editStatus,
    handleRotateTenantIntegrationApiKey,
    handleDeleteTenantIntegrationApiKey,
    handleDeleteTenantIntegrationClient,
    handleCreateTenantSubmit,
    handleUpsertTenantIntegrationApiKeySubmit,
    handleUpsertTenantIntegrationClientSubmit,
    handleCreateTenantUserSubmit,
    handleDeleteTenantModelAccessRule,
    handleTestTenantProviderConfiguration,
    onTestIntegrationClient,
    handleUpsertTenantModelAccessRuleSubmit,
    handleUpdateGlobalRolesSubmit,
    handleUpdateTenantPolicySubmit,
    handleUpdateTenantProviderConfigurationSubmit,
    handleUpdateTenantSubmit,
    handleUpdateTenantUserSubmit,
    isCreatePending,
    isCreateTenantIntegrationApiKeyPending,
    isCreateTenantIntegrationClientPending,
    isCreateTenantModelAccessRulePending,
    isCreateTenantUserPending,
    isDeleteTenantModelAccessRulePending,
    isDeleteTenantIntegrationApiKeyPending,
    isDeleteTenantIntegrationClientPending,
    isTestTenantIntegrationClientPending,
    isRotateTenantIntegrationApiKeyPending,
    isUpdateGlobalRolesPending,
    isUpdateTenantIntegrationApiKeyPending,
    isUpdateTenantIntegrationClientPending,
    isUpdatePending,
    isTestTenantProviderConfigurationPending,
    isUpdateTenantProviderConfigurationPending,
    isUpdateTenantPolicyPending,
    isUpdateTenantModelAccessRulePending,
    isUpdateTenantUserPending,
    integrationApiKeys,
    integrationApiKeysQuery,
    integrationClientMemberOptions,
    integrationClients,
    integrationClientsQuery,
    memberships,
    membershipsQuery,
    modelAccessRules,
    modelAccessRulesQuery,
    providerConfigurations,
    providerConfigurationsQuery,
    tenantPolicy,
    tenantPolicyQuery,
    onCloseCreate,
    onCloseCreateMember,
    onCloseEditGlobalRoles,
    onCloseEditIntegrationApiKey,
    onCloseEditIntegrationClient,
    onCloseEditMember,
    onCloseEditModelAccessRule,
    onCloseEditProviderConfiguration,
    onCreateAllowOverrideChange,
    onCreateDisplayNameChange,
    onCreateMemberDisplayNameChange,
    onCreateMemberEmailChange,
    onCreateMemberPasswordChange,
    onCreateMemberRolesChange,
    onCreateSlugChange,
    onDismissRevealedIntegrationApiKey,
    onEditAllowOverrideChange,
    onEditDisplayNameChange,
    onEditGlobalRolesChange,
    onEditIntegrationApiKeyExpiresAtChange,
    onEditIntegrationApiKeyLabelChange,
    onEditIntegrationApiKeyScopesChange,
    onEditIntegrationApiKeyStatusChange,
    onEditIntegrationClientApplicationIdChange,
    onEditIntegrationClientDefaultUserUuidChange,
    onEditIntegrationClientDisplayNameChange,
    onEditIntegrationClientIdChange,
    onEditIntegrationClientScopesChange,
    onEditIntegrationClientStatusChange,
    onEditIntegrationClientTrustedForwardedIdentityEnabledChange,
    onEditMemberRolesChange,
    onEditMemberStatusChange,
    onEditModelRuleCapabilityChange,
    onEditModelRuleEffectChange,
    onEditModelRuleMaxImagesPerRequestChange,
    onEditModelRuleMaxInputTokensChange,
    onEditModelRuleMaxOutputTokensChange,
    onEditModelRuleMaxResolutionChange,
    onEditModelRulePatternChange,
    onEditModelRulePriorityChange,
    onEditModelRuleProviderIdChange,
    onEditPolicyAllowPromptLoggingChange,
    onEditPolicyAllowResponseLoggingChange,
    onEditPolicyDailyRequestLimitChange,
    onEditPolicyImageRequestsPerMonthChange,
    onEditPolicyMaxInputTokensChange,
    onEditPolicyMaxOutputTokensChange,
    onEditPolicyMonthlyBudgetUsdChange,
    onEditPolicyMonthlyRequestLimitChange,
    onEditPolicyMonthlyTokenLimitChange,
    onEditPolicyRequestsPerMinuteChange,
    onEditPolicyRetentionDaysChange,
    onEditPolicyTokensPerMinuteChange,
    onEditStatusChange,
    onOpenCreate,
    onOpenCreateIntegrationApiKey,
    onOpenCreateIntegrationClient,
    onOpenCreateMember,
    onOpenEditGlobalRoles,
    onOpenEditIntegrationApiKey,
    onOpenEditIntegrationClient,
    onOpenEditMember,
    onOpenCreateModelAccessRule,
    onOpenEditModelAccessRule,
    onOpenEditProviderConfiguration,
    onSelectIntegrationClient,
    onSelectTenant,
    activeTenantLabel,
    revealedIntegrationApiKey,
    selectedIntegrationApiKey,
    selectedIntegrationClient,
    selectedMembershipIsSelf,
    selectedMembershipIsProtected,
    selectedMembership,
    selectedModelAccessRule,
    selectedProviderConfiguration,
    selectedTenant,
    tenantCards,
    tenantsQuery,
    editProviderAllowPlatformFallback,
    editProviderAllowTenantFallback,
    tenantCredentialLabel,
    tenantCredentialApiToken,
    tenantCredentialBaseUrl,
    selectedTenantProviderCredential,
    onTenantCredentialLabelChange,
    onTenantCredentialApiTokenChange,
    onTenantCredentialBaseUrlChange,
    handleSaveTenantProviderCredential,
    handleDeleteTenantProviderCredential,
    handleToggleTenantProviderCredential,
    isSaveTenantProviderCredentialPending,
    isDeleteTenantProviderCredentialPending,
    isToggleTenantProviderCredentialPending,
    editProviderConfigurationOpened,
    editProviderCredentialMode,
    editProviderDefaultImageModel,
    editProviderDefaultTextModel,
    editProviderEnabled,
    editProviderPreferUserCredentials,
    onEditProviderAllowPlatformFallbackChange,
    onEditProviderAllowTenantFallbackChange,
    onEditProviderCredentialModeChange,
    onEditProviderDefaultImageModelChange,
    onEditProviderDefaultTextModelChange,
    onEditProviderEnabledChange,
    onEditProviderPreferUserCredentialsChange,
    testTenantProviderConfigurationResult,
    testingIntegrationClientId,
    testTenantIntegrationClientResult,
    updateGlobalRolesError,
  } = useTenantsController();
  const [activeTab, setActiveTab] = useState<string>('settings');

  return (
    <>
      <PageHeader
        title={t('tenantsPage.tenantControl')}
        description={t(
          'tenantsPage.globalSuperAdminSurfaceForIsolatedWorkspace',
        )}
        context={activeTenantLabel}
        aside={
          <Button onClick={onOpenCreate}>
            {t('tenantsPage.createTenant')}
          </Button>
        }
      />

      <Grid gap="lg">
        <Grid.Col span={{ base: 12, xl: 5 }}>
          <Card className="section-card">
            <Group justify="space-between" mb="md">
              <Title order={3}>{t('tenantsPage.tenants')}</Title>
              <Badge variant="light">
                {tenantCards.length} {t('tenantsPage.total')}
              </Badge>
            </Group>
            <Stack gap="sm">
              {tenantCards.map((tenant) => (
                <Card
                  key={tenant.id}
                  withBorder
                  radius="lg"
                  className="tenant-card"
                  style={{
                    cursor: 'pointer',
                    borderColor:
                      selectedTenant?.id === tenant.id
                        ? 'var(--mantine-color-teal-5)'
                        : undefined,
                  }}
                  onClick={() => onSelectTenant(tenant)}
                >
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={700}>{tenant.displayName}</Text>
                      <Text size="sm" c="dimmed">
                        {tenant.slug}
                      </Text>
                    </div>
                    <Badge
                      color={tenant.status === 'active' ? 'moss' : 'red'}
                      variant="light"
                    >
                      {tenant.status}
                    </Badge>
                  </Group>
                  <SimpleGrid cols={2} mt="md" spacing="sm">
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        {t('tenantsPage.memberships')}
                      </Text>
                      <Text fw={600}>{tenant.membershipCount}</Text>
                    </div>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        {t('tenantsPage.userOverride')}
                      </Text>
                      <Text fw={600}>
                        {tenant.allowUserCredentialOverride
                          ? 'Allowed'
                          : 'Disabled'}
                      </Text>
                    </div>
                  </SimpleGrid>
                </Card>
              ))}
              {!tenantCards.length && !tenantsQuery.isPending ? (
                <Text c="dimmed" size="sm">
                  {t('tenantsPage.noTenantsFoundYet')}
                </Text>
              ) : null}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 7 }}>
          <Tabs
            keepMounted={false}
            radius="lg"
            value={activeTab}
            onChange={(value) => setActiveTab(value ?? 'settings')}
          >
            <Tabs.List mb="md" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <Tabs.Tab value="settings">
                {t('tenantsPage.tenantSettings')}
              </Tabs.Tab>
              <Tabs.Tab value="registration">
                {t('tenantsPage.registration')}
              </Tabs.Tab>
              <Tabs.Tab value="memberships">
                {t('tenantsPage.memberships')}
              </Tabs.Tab>
              <Tabs.Tab value="policies">
                {t('tenantsPage.policiesAmpLimits')}
              </Tabs.Tab>
              <Tabs.Tab value="providers">
                {t('tenantsPage.providerConfigurations')}
              </Tabs.Tab>
              <Tabs.Tab value="integration-clients">
                {t('tenantsPage.integrationClients')}
              </Tabs.Tab>
              <Tabs.Tab value="model-rules">
                {t('tenantsPage.modelAccessRules')}
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="registration">
              <Card className="section-card">
                <Group justify="space-between" mb="md">
                  <SectionTitle
                    title={t('tenantsPage.publicRegistration')}
                    help="Controls the tenant registration switch and exact public hostname mappings. The global kill switch remains authoritative."
                  />
                  {selectedTenant ? (
                    <Badge variant="outline">{selectedTenant.slug}</Badge>
                  ) : null}
                </Group>
                {selectedTenant ? (
                  <TenantRegistrationPanel
                    key={selectedTenant.id}
                    tenantId={selectedTenant.id}
                    activeTenantCount={
                      tenantCards.filter((tenant) => tenant.status === 'active')
                        .length
                    }
                  />
                ) : (
                  <Text c="dimmed" size="sm">
                    {t(
                      'tenantsPage.selectATenantToConfigurePublicRegistration',
                    )}
                  </Text>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="settings">
              <Card className="section-card">
                <Group justify="space-between" mb="md">
                  <SectionTitle
                    title={t('tenantsPage.tenantSettings')}
                    help="Basic tenant operating posture: friendly name, active or disabled state, and whether members may override tenant-level BYOK credentials with their own."
                  />
                  {selectedTenant ? (
                    <Badge variant="outline">{selectedTenant.slug}</Badge>
                  ) : null}
                </Group>
                {selectedTenant ? (
                  <form onSubmit={handleUpdateTenantSubmit}>
                    <Stack gap="md">
                      <TextInput
                        label={
                          <FieldLabel
                            label={t('tenantsPage.displayName')}
                            help="Human-friendly tenant name shown in the admin UI."
                          />
                        }
                        value={editDisplayName}
                        onChange={(event) =>
                          onEditDisplayNameChange(event.currentTarget.value)
                        }
                      />
                      <Select
                        label={
                          <FieldLabel
                            label={t('tenantsPage.status')}
                            help="Active tenants can operate normally. Disabled tenants stay in the system but should no longer be used operationally."
                          />
                        }
                        data={[
                          { value: 'active', label: 'Active' },
                          { value: 'disabled', label: 'Disabled' },
                        ]}
                        value={editStatus}
                        onChange={onEditStatusChange}
                      />
                      <Switch
                        checked={editAllowOverride}
                        label={
                          <FieldLabel
                            label={t('tenantsPage.allowUserCredentialOverride')}
                            help="If enabled, a member's own BYOK credential can override the tenant default when the provider configuration also permits it."
                          />
                        }
                        description={t(
                          'tenantsPage.whenEnabledUserScopedBYOKCredentialsCan',
                        )}
                        onChange={(event) =>
                          onEditAllowOverrideChange(event.currentTarget.checked)
                        }
                      />
                      <Group justify="flex-end">
                        <Button loading={isUpdatePending} type="submit">
                          {t('tenantsPage.saveTenant')}
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('tenantsPage.selectATenantToInspectOrUpdate')}
                  </Text>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="memberships">
              <Card className="section-card">
                <Group justify="space-between" mb="md">
                  <SectionTitle
                    title={t('tenantsPage.memberships')}
                    help="Defines which global users belong to this tenant and which tenant-scoped roles they hold here. A user may appear in multiple tenants with different roles."
                  />
                  <Group gap="sm">
                    {selectedTenant ? (
                      <Badge variant="light">
                        {memberships.length} {t('tenantsPage.members')}
                      </Badge>
                    ) : null}
                    <Button
                      size="xs"
                      onClick={onOpenCreateMember}
                      disabled={!selectedTenant}
                    >
                      {t('tenantsPage.addMember')}
                    </Button>
                  </Group>
                </Group>
                {selectedTenant ? (
                  <Table.ScrollContainer minWidth={760}>
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('tenantsPage.user')}</Table.Th>
                          <Table.Th>{t('tenantsPage.tenantRoles')}</Table.Th>
                          <Table.Th>{t('tenantsPage.globalRoles')}</Table.Th>
                          <Table.Th>{t('tenantsPage.status')}</Table.Th>
                          <Table.Th>{t('tenantsPage.actions')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {memberships.map((membership) => (
                          <Table.Tr
                            key={`${membership.tenantId}-${membership.userUuid}`}
                          >
                            <Table.Td>
                              <Text fw={600}>{membership.displayName}</Text>
                              <Text size="sm" c="dimmed">
                                {membership.email}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="wrap">
                                {membership.roles.map((role) => (
                                  <Badge key={role} variant="light">
                                    {role}
                                  </Badge>
                                ))}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="wrap">
                                {membership.globalRoles.length ? (
                                  membership.globalRoles.map((role) => (
                                    <Badge
                                      key={role}
                                      color="grape"
                                      variant="light"
                                    >
                                      {role}
                                    </Badge>
                                  ))
                                ) : (
                                  <Text size="sm" c="dimmed">
                                    {t('tenantsPage.none')}
                                  </Text>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={
                                  membership.status === 'active'
                                    ? 'moss'
                                    : 'red'
                                }
                                variant="light"
                              >
                                {membership.status}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() => onOpenEditMember(membership)}
                                >
                                  {membership.globalRoles.includes(
                                    'super_admin',
                                  )
                                    ? 'Protected'
                                    : 'Edit member'}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={() =>
                                    onOpenEditGlobalRoles(membership)
                                  }
                                >
                                  {t('tenantsPage.globalAccess')}
                                </Button>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('tenantsPage.selectATenantToInspectItsMembership')}
                  </Text>
                )}
                {selectedTenant &&
                !memberships.length &&
                !membershipsQuery.isPending ? (
                  <Text c="dimmed" size="sm" mt="md">
                    {t('tenantsPage.thisTenantHasNoMembershipsYet')}
                  </Text>
                ) : null}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="policies">
              <Card className="section-card">
                <Group justify="space-between" mb="md">
                  <SectionTitle
                    title={t('tenantsPage.policiesLimits')}
                    help="Operational guardrails like request rates, budget ceilings, token ceilings, logging posture, and retention defaults. Some fields are enforced now, while others are persisted for future hardening."
                  />
                  {selectedTenant ? (
                    <Badge variant="light">
                      {t('tenantsPage.appEnforced')}
                    </Badge>
                  ) : null}
                </Group>
                {selectedTenant ? (
                  <form onSubmit={handleUpdateTenantPolicySubmit}>
                    <Stack gap="md">
                      <Text size="sm" c="dimmed">
                        {t(
                          'tenantsPage.theGatewayCurrentlyEnforcesRequestWindowsMonthly',
                        )}
                      </Text>
                      <Group grow>
                        <TextInput
                          label={
                            <FieldLabel
                              label={t('tenantsPage.monthlyBudgetUSD')}
                              help="Soft budget ceiling for this tenant's monthly usage. Once reached, the gateway blocks further requests with a quota event."
                            />
                          }
                          placeholder="250.00"
                          value={editPolicyMonthlyBudgetUsd}
                          onChange={(event) =>
                            onEditPolicyMonthlyBudgetUsdChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                        <TextInput
                          label={
                            <FieldLabel
                              label={t('tenantsPage.retentionDays')}
                              help="Planned retention posture for tenant-owned telemetry and operational records."
                            />
                          }
                          value={editPolicyRetentionDays}
                          onChange={(event) =>
                            onEditPolicyRetentionDaysChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                      </Group>
                      <Group grow>
                        <TextInput
                          label={
                            <FieldLabel
                              label={t('tenantsPage.requestsPerMinute')}
                              help="Per-tenant request rate ceiling across gateway calls."
                            />
                          }
                          value={editPolicyRequestsPerMinute}
                          onChange={(event) =>
                            onEditPolicyRequestsPerMinuteChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                        <TextInput
                          label={
                            <FieldLabel
                              label={t('tenantsPage.tokensPerMinute')}
                              help="Per-tenant rolling token ceiling across compatible requests."
                            />
                          }
                          value={editPolicyTokensPerMinute}
                          onChange={(event) =>
                            onEditPolicyTokensPerMinuteChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                      </Group>
                      <Group grow>
                        <TextInput
                          label={t('tenantsPage.dailyRequestLimit')}
                          value={editPolicyDailyRequestLimit}
                          onChange={(event) =>
                            onEditPolicyDailyRequestLimitChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                        <TextInput
                          label={t('tenantsPage.monthlyRequestLimit')}
                          value={editPolicyMonthlyRequestLimit}
                          onChange={(event) =>
                            onEditPolicyMonthlyRequestLimitChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                      </Group>
                      <Group grow>
                        <TextInput
                          label={t('tenantsPage.monthlyTokenLimit')}
                          value={editPolicyMonthlyTokenLimit}
                          onChange={(event) =>
                            onEditPolicyMonthlyTokenLimitChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                        <TextInput
                          label={t('tenantsPage.imageRequestsPerMonth')}
                          value={editPolicyImageRequestsPerMonth}
                          onChange={(event) =>
                            onEditPolicyImageRequestsPerMonthChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                      </Group>
                      <Group grow>
                        <TextInput
                          label={t('tenantsPage.maxInputTokens')}
                          value={editPolicyMaxInputTokens}
                          onChange={(event) =>
                            onEditPolicyMaxInputTokensChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                        <TextInput
                          label={t('tenantsPage.maxOutputTokens')}
                          value={editPolicyMaxOutputTokens}
                          onChange={(event) =>
                            onEditPolicyMaxOutputTokensChange(
                              event.currentTarget.value,
                            )
                          }
                        />
                      </Group>
                      <Group grow>
                        <Switch
                          checked={editPolicyAllowPromptLogging}
                          label={t('tenantsPage.allowPromptLogging')}
                          onChange={(event) =>
                            onEditPolicyAllowPromptLoggingChange(
                              event.currentTarget.checked,
                            )
                          }
                        />
                        <Switch
                          checked={editPolicyAllowResponseLogging}
                          label={t('tenantsPage.allowResponseLogging')}
                          onChange={(event) =>
                            onEditPolicyAllowResponseLoggingChange(
                              event.currentTarget.checked,
                            )
                          }
                        />
                      </Group>
                      <Text size="xs" c="dimmed">
                        {tenantPolicy?.createdAt
                          ? `Policy row persisted and last updated ${new Date(
                              tenantPolicy.updatedAt ?? tenantPolicy.createdAt,
                            ).toLocaleString()}.`
                          : 'No policy row has been persisted yet. Saving here will materialize the tenant defaults.'}
                      </Text>
                      <Group justify="flex-end">
                        <Button
                          loading={isUpdateTenantPolicyPending}
                          type="submit"
                        >
                          {t('tenantsPage.savePolicy')}
                        </Button>
                      </Group>
                    </Stack>
                  </form>
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('tenantsPage.selectATenantToConfigureItsCost')}
                  </Text>
                )}
                {selectedTenant &&
                !tenantPolicy &&
                !tenantPolicyQuery.isPending ? (
                  <Text c="dimmed" size="sm" mt="md">
                    {t(
                      'tenantsPage.theGatewayIsCurrentlyUsingImplicitDefaults',
                    )}
                  </Text>
                ) : null}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="providers">
              <Card className="section-card">
                <Group justify="space-between" mb="md">
                  <SectionTitle
                    title={t('tenantsPage.providerConfigurations')}
                    help="Controls whether a provider is available to this tenant, which default models it uses, and how credentials are resolved between platform, tenant, and user scopes."
                  />
                  {selectedTenant ? (
                    <Badge variant="light">
                      {providerConfigurations.length}{' '}
                      {t('tenantsPage.providers')}
                    </Badge>
                  ) : null}
                </Group>
                {selectedTenant ? (
                  <Table.ScrollContainer minWidth={760}>
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('tenantsPage.provider')}</Table.Th>
                          <Table.Th>{t('tenantsPage.status')}</Table.Th>
                          <Table.Th>{t('tenantsPage.credentialPath')}</Table.Th>
                          <Table.Th>{t('tenantsPage.defaults')}</Table.Th>
                          <Table.Th>{t('tenantsPage.actions')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {providerConfigurations.map((configuration) => (
                          <Table.Tr key={configuration.providerId}>
                            <Table.Td>
                              <Text fw={600}>
                                {configuration.providerDisplayName}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {configuration.providerId}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs" wrap="wrap">
                                <Badge
                                  color={configuration.enabled ? 'moss' : 'red'}
                                  variant="light"
                                >
                                  {configuration.enabled
                                    ? 'enabled'
                                    : 'disabled'}
                                </Badge>
                                <Badge
                                  color={
                                    configuration.providerStatus === 'active'
                                      ? 'blue'
                                      : 'gray'
                                  }
                                  variant="outline"
                                >
                                  {t('tenantsPage.platform')}
                                  {configuration.providerStatus}
                                </Badge>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={600}>
                                {configuration.credentialMode}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {configuration.preferUserCredentials
                                  ? 'User-first'
                                  : 'Tenant-first'}
                                {' / '}
                                {configuration.allowTenantFallback
                                  ? 'tenant fallback'
                                  : 'no tenant fallback'}
                                {' / '}
                                {configuration.allowPlatformFallback
                                  ? 'platform fallback'
                                  : 'no platform fallback'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {t('tenantsPage.text')}{' '}
                                {configuration.defaultTextModel ??
                                  'No tenant default'}
                              </Text>
                              <Text size="sm">
                                {t('tenantsPage.image')}{' '}
                                {configuration.defaultImageModel ??
                                  'No tenant default'}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Button
                                size="xs"
                                variant="light"
                                onClick={() =>
                                  onOpenEditProviderConfiguration(configuration)
                                }
                              >
                                {t('tenantsPage.editConfig')}
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('tenantsPage.selectATenantToManageProviderEnablement')}
                  </Text>
                )}
                {selectedTenant &&
                !providerConfigurations.length &&
                !providerConfigurationsQuery.isPending ? (
                  <Text c="dimmed" size="sm" mt="md">
                    {t('tenantsPage.thisTenantHasNoProviderConfigurationsYet')}
                  </Text>
                ) : null}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="integration-clients">
              <Card className="section-card">
                <Group justify="space-between" mb="md">
                  <SectionTitle
                    title={t('tenantsPage.integrationClients')}
                    help="Technical identities for apps like Open WebUI. They are tenant-bound, scoped, and own one or more rotatable API keys."
                  />
                  <Group gap="sm">
                    {selectedTenant ? (
                      <Badge variant="light">
                        {integrationClients.length} {t('tenantsPage.clients')}
                      </Badge>
                    ) : null}
                    <Button
                      size="xs"
                      onClick={onOpenCreateIntegrationClient}
                      disabled={!selectedTenant}
                    >
                      {t('tenantsPage.addClient')}
                    </Button>
                  </Group>
                </Group>
                {selectedTenant ? (
                  <Stack gap="md">
                    {revealedIntegrationApiKey ? (
                      <Alert
                        color="yellow"
                        variant="light"
                        title={t('tenantsPage.copyThisAPIKeyNow')}
                      >
                        <Stack gap="xs">
                          <Text size="sm">
                            {t('tenantsPage.thisSecretFor')}{' '}
                            <Text span fw={700}>
                              {revealedIntegrationApiKey.clientDisplayName}
                            </Text>{' '}
                            /{' '}
                            <Text span fw={700}>
                              {revealedIntegrationApiKey.label}
                            </Text>{' '}
                            {t('tenantsPage.isShownOnlyOnce')}
                          </Text>
                          <Code block>{revealedIntegrationApiKey.apiKey}</Code>
                          <Group justify="flex-end">
                            <Button
                              size="xs"
                              variant="light"
                              onClick={onDismissRevealedIntegrationApiKey}
                            >
                              {t('tenantsPage.dismiss')}
                            </Button>
                          </Group>
                        </Stack>
                      </Alert>
                    ) : null}
                    {testTenantIntegrationClientResult ? (
                      <Alert
                        color={
                          testTenantIntegrationClientResult.ready
                            ? 'teal'
                            : 'red'
                        }
                        variant="light"
                        title={
                          testTenantIntegrationClientResult.ready
                            ? 'Integration client authentication succeeded'
                            : 'Integration client authentication failed'
                        }
                      >
                        <Stack gap={4}>
                          <Text size="sm">
                            {testTenantIntegrationClientResult.message}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {t('tenantsPage.client')}
                            {testTenantIntegrationClientResult.clientId}
                            {' · '}
                            {t('tenantsPage.identity')}{' '}
                            {testTenantIntegrationClientResult.principalKind ??
                              testTenantIntegrationClientResult.identityMode}
                            {' · '}
                            {t('tenantsPage.scopes')}{' '}
                            {testTenantIntegrationClientResult.scopes.join(
                              ', ',
                            ) || 'none'}
                          </Text>
                          {testTenantIntegrationClientResult.scopes.includes(
                            'evaluation:invoke',
                          ) ? (
                            <Text size="sm" c="dimmed">
                              {t(
                                'tenantsPage.evaluationReadinessAlsoRequiresAnEnabledProfile',
                              )}
                            </Text>
                          ) : null}
                        </Stack>
                      </Alert>
                    ) : null}
                    <Table.ScrollContainer minWidth={860}>
                      <Table highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>{t('tenantsPage.client2')}</Table.Th>
                            <Table.Th>{t('tenantsPage.identity2')}</Table.Th>
                            <Table.Th>{t('tenantsPage.scopes2')}</Table.Th>
                            <Table.Th>{t('tenantsPage.status')}</Table.Th>
                            <Table.Th>{t('tenantsPage.actions')}</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {integrationClients.map((client) => (
                            <Table.Tr
                              key={client.id}
                              style={{
                                backgroundColor:
                                  selectedIntegrationClient?.id === client.id
                                    ? 'var(--mantine-color-teal-0)'
                                    : undefined,
                              }}
                            >
                              <Table.Td>
                                <Text fw={600}>{client.displayName}</Text>
                                <Text size="sm" c="dimmed">
                                  {client.clientId}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  {t('tenantsPage.app')}
                                  {client.applicationId}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge variant="light" mb={4}>
                                  {client.identityMode
                                    .toLowerCase()
                                    .replaceAll('_', ' ')}
                                </Badge>
                                <Text size="sm">
                                  {t('tenantsPage.servicePrincipal')}
                                  {client.clientId}
                                </Text>
                                <Text size="sm">
                                  {t('tenantsPage.defaultUserFallback')}{' '}
                                  {client.defaultUserDisplayName ?? 'None'}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  {t('tenantsPage.forwardedIdentity')}{' '}
                                  {client.trustedForwardedIdentityEnabled
                                    ? 'trusted'
                                    : 'disabled'}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs" wrap="wrap">
                                  {client.scopes.map((scope) => (
                                    <Badge key={scope} variant="light">
                                      {scope}
                                    </Badge>
                                  ))}
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs" wrap="wrap">
                                  <Badge
                                    color={
                                      client.status === 'active'
                                        ? 'moss'
                                        : 'red'
                                    }
                                    variant="light"
                                  >
                                    {client.status}
                                  </Badge>
                                  <Badge variant="outline">
                                    {client.apiKeyCount} {t('tenantsPage.keys')}
                                  </Badge>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Menu position="bottom-end" withinPortal>
                                  <Menu.Target>
                                    <Button
                                      aria-label={`Actions for ${client.displayName}`}
                                      disabled={
                                        isDeleteTenantIntegrationClientPending
                                      }
                                      loading={
                                        isTestTenantIntegrationClientPending &&
                                        testingIntegrationClientId === client.id
                                      }
                                      rightSection={
                                        <IconChevronDown size={14} />
                                      }
                                      size="xs"
                                      variant="light"
                                    >
                                      {t('tenantsPage.actions')}
                                    </Button>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item
                                      onClick={() =>
                                        onSelectIntegrationClient(client)
                                      }
                                    >
                                      {t('tenantsPage.viewKeys')}
                                    </Menu.Item>
                                    <Menu.Item
                                      onClick={() =>
                                        onTestIntegrationClient(client)
                                      }
                                    >
                                      {t('tenantsPage.testClient')}
                                    </Menu.Item>
                                    <Menu.Item
                                      onClick={() =>
                                        onOpenEditIntegrationClient(client)
                                      }
                                    >
                                      {t('tenantsPage.editClient')}
                                    </Menu.Item>
                                    <Menu.Item
                                      onClick={() =>
                                        onOpenCreateIntegrationApiKey(client)
                                      }
                                    >
                                      {t('tenantsPage.createKey')}
                                    </Menu.Item>
                                    <Menu.Divider />
                                    <Menu.Item
                                      color="red"
                                      onClick={() =>
                                        handleDeleteTenantIntegrationClient(
                                          client,
                                        )
                                      }
                                    >
                                      {t('tenantsPage.deleteClient')}
                                    </Menu.Item>
                                  </Menu.Dropdown>
                                </Menu>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                    {selectedIntegrationClient ? (
                      <Card withBorder radius="lg">
                        <Group justify="space-between" mb="md">
                          <div>
                            <Text fw={700}>
                              {t('tenantsPage.apiKeysFor')}{' '}
                              {selectedIntegrationClient.displayName}
                            </Text>
                            <Text size="sm" c="dimmed">
                              {selectedIntegrationClient.clientId}
                            </Text>
                          </div>
                          <Button
                            size="xs"
                            onClick={() =>
                              onOpenCreateIntegrationApiKey(
                                selectedIntegrationClient,
                              )
                            }
                          >
                            {t('tenantsPage.createKey')}
                          </Button>
                        </Group>
                        <Table.ScrollContainer minWidth={760}>
                          <Table highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>{t('tenantsPage.label')}</Table.Th>
                                <Table.Th>{t('tenantsPage.hint')}</Table.Th>
                                <Table.Th>{t('tenantsPage.scopes2')}</Table.Th>
                                <Table.Th>{t('tenantsPage.status')}</Table.Th>
                                <Table.Th>{t('tenantsPage.lastUsed')}</Table.Th>
                                <Table.Th>{t('tenantsPage.actions')}</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {integrationApiKeys.map((apiKey) => (
                                <Table.Tr key={apiKey.id}>
                                  <Table.Td>
                                    <Text fw={600}>{apiKey.label}</Text>
                                    <Text size="sm" c="dimmed">
                                      {apiKey.expiresAt
                                        ? `Expires ${new Date(apiKey.expiresAt).toLocaleString()}`
                                        : 'No expiry'}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Code>{apiKey.keyHint ?? 'hidden'}</Code>
                                  </Table.Td>
                                  <Table.Td>
                                    <Group gap="xs" wrap="wrap">
                                      {apiKey.scopes.map((scope) => (
                                        <Badge key={scope} variant="light">
                                          {scope}
                                        </Badge>
                                      ))}
                                    </Group>
                                  </Table.Td>
                                  <Table.Td>
                                    <Badge
                                      color={
                                        apiKey.status === 'active'
                                          ? 'moss'
                                          : 'red'
                                      }
                                      variant="light"
                                    >
                                      {apiKey.status}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="sm">
                                      {apiKey.lastUsedAt
                                        ? new Date(
                                            apiKey.lastUsedAt,
                                          ).toLocaleString()
                                        : 'Never'}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Menu position="bottom-end" withinPortal>
                                      <Menu.Target>
                                        <Button
                                          aria-label={`Actions for ${apiKey.label}`}
                                          disabled={
                                            isDeleteTenantIntegrationApiKeyPending
                                          }
                                          rightSection={
                                            <IconChevronDown size={14} />
                                          }
                                          size="xs"
                                          variant="light"
                                        >
                                          {t('tenantsPage.actions')}
                                        </Button>
                                      </Menu.Target>
                                      <Menu.Dropdown>
                                        <Menu.Item
                                          onClick={() =>
                                            onOpenEditIntegrationApiKey(
                                              selectedIntegrationClient,
                                              apiKey,
                                            )
                                          }
                                        >
                                          {t('tenantsPage.editKey')}
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Item
                                          color="red"
                                          onClick={() =>
                                            handleDeleteTenantIntegrationApiKey(
                                              selectedIntegrationClient,
                                              apiKey,
                                            )
                                          }
                                        >
                                          {t('tenantsPage.deleteKey')}
                                        </Menu.Item>
                                      </Menu.Dropdown>
                                    </Menu>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </Table.ScrollContainer>
                        {!integrationApiKeys.length &&
                        !integrationApiKeysQuery.isPending ? (
                          <Text c="dimmed" size="sm" mt="md">
                            {t('tenantsPage.thisIntegrationClientHasNoAPIKeys')}
                          </Text>
                        ) : null}
                      </Card>
                    ) : (
                      <Text c="dimmed" size="sm">
                        {t('tenantsPage.selectAnIntegrationClientToInspectAnd')}
                      </Text>
                    )}
                  </Stack>
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('tenantsPage.selectATenantToManageTenantScoped')}
                  </Text>
                )}
                {selectedTenant &&
                !integrationClients.length &&
                !integrationClientsQuery.isPending ? (
                  <Text c="dimmed" size="sm" mt="md">
                    {t('tenantsPage.thisTenantHasNoIntegrationClientsYet')}
                  </Text>
                ) : null}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel value="model-rules">
              <Card className="section-card">
                <Group justify="space-between" mb="md">
                  <SectionTitle
                    title={t('tenantsPage.modelAccessRules')}
                    help="Allow or deny rules for provider models, evaluated by priority. At equal priority, deny wins over allow."
                  />
                  <Group gap="sm">
                    {selectedTenant ? (
                      <Badge variant="light">
                        {modelAccessRules.length} {t('tenantsPage.rules')}
                      </Badge>
                    ) : null}
                    <Button
                      size="xs"
                      onClick={onOpenCreateModelAccessRule}
                      disabled={!selectedTenant}
                    >
                      {t('tenantsPage.addRule')}
                    </Button>
                  </Group>
                </Group>
                {selectedTenant ? (
                  <Table.ScrollContainer minWidth={860}>
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>{t('tenantsPage.provider')}</Table.Th>
                          <Table.Th>{t('tenantsPage.pattern')}</Table.Th>
                          <Table.Th>{t('tenantsPage.capability')}</Table.Th>
                          <Table.Th>{t('tenantsPage.effect')}</Table.Th>
                          <Table.Th>{t('tenantsPage.limits')}</Table.Th>
                          <Table.Th>{t('tenantsPage.priority')}</Table.Th>
                          <Table.Th>{t('tenantsPage.actions')}</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {modelAccessRules.map((rule) => (
                          <Table.Tr key={rule.id}>
                            <Table.Td>
                              <Text fw={600}>{rule.providerId}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text fw={600}>{rule.modelPattern}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light">{rule.capability}</Badge>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={rule.effect === 'allow' ? 'teal' : 'red'}
                                variant="light"
                              >
                                {rule.effect}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                {t('tenantsPage.in')}
                                {rule.maxInputTokens ?? 'n/a'}{' '}
                                {t('tenantsPage.out')}{' '}
                                {rule.maxOutputTokens ?? 'n/a'}
                              </Text>
                              <Text size="sm">
                                {t('tenantsPage.images')}
                                {rule.maxImagesPerRequest ?? 'n/a'}{' '}
                                {t('tenantsPage.res')}
                                {rule.maxResolution ?? 'n/a'}
                              </Text>
                            </Table.Td>
                            <Table.Td>{rule.priority}</Table.Td>
                            <Table.Td>
                              <Button
                                size="xs"
                                variant="light"
                                onClick={() => onOpenEditModelAccessRule(rule)}
                              >
                                {t('tenantsPage.editRule')}
                              </Button>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </Table.ScrollContainer>
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('tenantsPage.selectATenantToControlWhichModels')}
                  </Text>
                )}
                {selectedTenant &&
                !modelAccessRules.length &&
                !modelAccessRulesQuery.isPending ? (
                  <Text c="dimmed" size="sm" mt="md">
                    {t('tenantsPage.noModelAccessRulesAreDefinedYet')}
                  </Text>
                ) : null}
              </Card>
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>
      </Grid>

      <Modal
        opened={createOpened}
        onClose={onCloseCreate}
        title={t('tenantsPage.createTenant')}
      >
        <form onSubmit={handleCreateTenantSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('tenantsPage.provisionANewTenantIsolationBoundaryWith')}
            </Text>
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.slug')}
                  help="Stable human-readable identifier used in URLs, ops, and tenant references. It should remain stable after creation."
                />
              }
              placeholder={t('tenantsPage.customerAcme')}
              value={createSlug}
              onChange={(event) =>
                onCreateSlugChange(event.currentTarget.value)
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.displayName')}
                  help="Friendly tenant name shown to operators throughout the control plane."
                />
              }
              placeholder={t('tenantsPage.customerAcme2')}
              value={createDisplayName}
              onChange={(event) =>
                onCreateDisplayNameChange(event.currentTarget.value)
              }
            />
            <Switch
              checked={createAllowOverride}
              label={
                <FieldLabel
                  label={t('tenantsPage.allowUserCredentialOverride')}
                  help="Sets the tenant default for whether members may use their own BYOK credential instead of the tenant default."
                />
              }
              onChange={(event) =>
                onCreateAllowOverrideChange(event.currentTarget.checked)
              }
            />
            <Group justify="space-between">
              <Button onClick={onCloseCreate} type="button" variant="light">
                {t('tenantsPage.cancel')}
              </Button>
              <Button
                loading={isCreatePending}
                type="submit"
                disabled={!createSlug.trim() || !createDisplayName.trim()}
              >
                {t('tenantsPage.createTenant')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={createMemberOpened}
        onClose={onCloseCreateMember}
        title={t('tenantsPage.addTenantMember')}
      >
        <form onSubmit={handleCreateTenantUserSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('tenantsPage.attachAnExistingGlobalUserByEmail')}
            </Text>
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.displayName')}
                  help="Friendly name for the member when provisioning a brand-new global account."
                />
              }
              description={t(
                'tenantsPage.optionalWhenAttachingAnExistingGlobalUser',
              )}
              value={createMemberDisplayName}
              onChange={(event) =>
                onCreateMemberDisplayNameChange(event.currentTarget.value)
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.email')}
                  help="Global user identity. If this email already exists, the user is attached to this tenant instead of being recreated."
                />
              }
              type="email"
              value={createMemberEmail}
              onChange={(event) =>
                onCreateMemberEmailChange(event.currentTarget.value)
              }
            />
            <PasswordInput
              label={
                <FieldLabel
                  label={t('tenantsPage.temporaryPassword')}
                  help="Only needed when creating a brand-new global account. Existing users keep their current password."
                />
              }
              description={t(
                'tenantsPage.optionalWhenAttachingAnExistingGlobalUser',
              )}
              value={createMemberPassword}
              onChange={(event) =>
                onCreateMemberPasswordChange(event.currentTarget.value)
              }
            />
            <MultiSelect
              label={
                <FieldLabel
                  label={t('tenantsPage.tenantRoles')}
                  help="Tenant-scoped permissions granted inside this tenant only, such as tenant_admin or operator."
                />
              }
              value={createMemberRoles}
              onChange={onCreateMemberRolesChange}
              searchable={false}
              data={[
                { value: 'viewer', label: 'Viewer' },
                { value: 'user', label: 'User' },
                { value: 'operator', label: 'Operator' },
                { value: 'tenant_admin', label: 'Tenant admin' },
              ]}
            />
            <Group justify="space-between">
              <Button
                onClick={onCloseCreateMember}
                type="button"
                variant="light"
              >
                {t('tenantsPage.cancel')}
              </Button>
              <Button
                loading={isCreateTenantUserPending}
                type="submit"
                disabled={!createMemberEmail.trim()}
              >
                {t('tenantsPage.addMember')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editMemberOpened}
        onClose={onCloseEditMember}
        title={t('tenantsPage.editTenantMember')}
      >
        <form onSubmit={handleUpdateTenantUserSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {selectedMembershipIsProtected
                ? 'This account has the global super_admin role. Tenant workflows can inspect it, but cannot downgrade or disable it.'
                : 'Update tenant-scoped roles or disable the selected user account for this tenant workflow.'}
            </Text>
            {selectedMembership ? (
              <div>
                <Text fw={700}>{selectedMembership.displayName}</Text>
                <Text size="sm" c="dimmed">
                  {selectedMembership.email}
                </Text>
              </div>
            ) : null}
            <MultiSelect
              disabled={selectedMembershipIsProtected}
              label={
                <FieldLabel
                  label={t('tenantsPage.tenantRoles')}
                  help="Tenant-scoped permissions for this user inside the selected tenant only."
                />
              }
              value={editMemberRoles}
              onChange={onEditMemberRolesChange}
              searchable={false}
              data={[
                { value: 'viewer', label: 'Viewer' },
                { value: 'user', label: 'User' },
                { value: 'operator', label: 'Operator' },
                { value: 'tenant_admin', label: 'Tenant admin' },
              ]}
            />
            <Select
              disabled={selectedMembershipIsProtected}
              label={
                <FieldLabel
                  label={t('tenantsPage.status')}
                  help="Disabled members remain in the tenant history but should no longer operate through this tenant workflow."
                />
              }
              value={editMemberStatus}
              onChange={onEditMemberStatusChange}
              data={[
                { value: 'active', label: 'Active' },
                { value: 'disabled', label: 'Disabled' },
              ]}
            />
            <Group justify="space-between">
              <Button onClick={onCloseEditMember} type="button" variant="light">
                {t('tenantsPage.cancel')}
              </Button>
              <Button
                loading={isUpdateTenantUserPending}
                type="submit"
                disabled={selectedMembershipIsProtected}
              >
                {selectedMembershipIsProtected ? 'Protected' : 'Save member'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editGlobalRolesOpened}
        onClose={onCloseEditGlobalRoles}
        title={t('tenantsPage.globalAccess')}
      >
        <form onSubmit={handleUpdateGlobalRolesSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('tenantsPage.globalRolesAreControlPlanePrivilegesAnd')}
            </Text>
            {selectedMembership ? (
              <div>
                <Text fw={700}>{selectedMembership.displayName}</Text>
                <Text size="sm" c="dimmed">
                  {selectedMembership.email}
                </Text>
              </div>
            ) : null}
            {selectedMembershipIsSelf &&
            selectedMembership?.globalRoles.includes('super_admin') ? (
              <Alert
                color="grape"
                variant="light"
                title={t('tenantsPage.protectedAccount')}
              >
                {t('tenantsPage.yourCurrentSessionIsUsingThisSuper')}
              </Alert>
            ) : null}
            {updateGlobalRolesError ? (
              <Alert
                color="red"
                variant="light"
                title={t('tenantsPage.updateFailed')}
              >
                {updateGlobalRolesError}
              </Alert>
            ) : null}
            <MultiSelect
              label={
                <FieldLabel
                  label={t('tenantsPage.globalRoles')}
                  help="Global control-plane privileges that apply across tenants. This is separate from tenant membership."
                />
              }
              value={editGlobalRoles}
              onChange={onEditGlobalRolesChange}
              searchable={false}
              data={[{ value: 'super_admin', label: 'Super admin' }]}
            />
            <Group justify="space-between">
              <Button
                onClick={onCloseEditGlobalRoles}
                type="button"
                variant="light"
              >
                {t('tenantsPage.cancel')}
              </Button>
              <Button loading={isUpdateGlobalRolesPending} type="submit">
                {t('tenantsPage.saveGlobalAccess')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editIntegrationClientOpened}
        onClose={onCloseEditIntegrationClient}
        title={
          selectedIntegrationClient
            ? 'Edit integration client'
            : 'Add integration client'
        }
      >
        <form onSubmit={handleUpsertTenantIntegrationClientSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('tenantsPage.technicalClientsAreTenantBoundRootsOf')}
            </Text>
            {!editIntegrationClientTrustedForwardedIdentityEnabled &&
            !editIntegrationClientDefaultUserUuid ? (
              <Alert color="teal" title={t('tenantsPage.serviceIdentityOnly')}>
                {t('tenantsPage.theIntegrationClientItselfIsTheAuthenticated')}
              </Alert>
            ) : null}
            <TextInput
              disabled={Boolean(selectedIntegrationClient)}
              label={
                <FieldLabel
                  label={t('tenantsPage.clientID')}
                  help="Stable technical identifier for this integration client. It is part of the trust boundary and should not be changed casually."
                />
              }
              placeholder={t('tenantsPage.openWebuiDemo')}
              value={editIntegrationClientId}
              onChange={(event) =>
                onEditIntegrationClientIdChange(event.currentTarget.value)
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.displayName')}
                  help="Friendly name shown to operators for this technical client."
                />
              }
              placeholder={t('tenantsPage.openWebUIDemo')}
              value={editIntegrationClientDisplayName}
              onChange={(event) =>
                onEditIntegrationClientDisplayNameChange(
                  event.currentTarget.value,
                )
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.applicationID')}
                  help="Human-readable application grouping such as open-webui or creative-studio."
                />
              }
              placeholder={t('tenantsPage.openWebui')}
              value={editIntegrationClientApplicationId}
              onChange={(event) =>
                onEditIntegrationClientApplicationIdChange(
                  event.currentTarget.value,
                )
              }
            />
            <Select
              clearable
              searchable
              label={
                <FieldLabel
                  label={t('tenantsPage.defaultUser')}
                  help="Optional fallback used only when no validated delegated user is supplied. Leave empty for a service-only client."
                />
              }
              placeholder={t('tenantsPage.noneUseServiceIdentity')}
              data={integrationClientMemberOptions}
              value={editIntegrationClientDefaultUserUuid || null}
              onChange={(value) =>
                onEditIntegrationClientDefaultUserUuidChange(value ?? '')
              }
            />
            <MultiSelect
              label={
                <FieldLabel
                  label={t('tenantsPage.scopes2')}
                  help="Capabilities this technical client may call through the gateway. Keep this as narrow as practical."
                />
              }
              searchable={false}
              value={editIntegrationClientScopes}
              onChange={onEditIntegrationClientScopesChange}
              data={INTEGRATION_CLIENT_SCOPES.map((scope) => ({
                value: scope,
                label: scope,
              }))}
            />
            <Switch
              checked={editIntegrationClientTrustedForwardedIdentityEnabled}
              label={
                <FieldLabel
                  label={t('tenantsPage.trustForwardedHumanIdentity')}
                  help="Allows a validated delegated user to supplement the service caller. The integration client remains attributable as the technical caller."
                />
              }
              description={t('tenantsPage.onlyEnableThisBehindATrustedProxy')}
              onChange={(event) =>
                onEditIntegrationClientTrustedForwardedIdentityEnabledChange(
                  event.currentTarget.checked,
                )
              }
            />
            {selectedIntegrationClient ? (
              <Select
                label={
                  <FieldLabel
                    label={t('tenantsPage.status')}
                    help="Disabled technical clients can remain defined without being able to authenticate."
                  />
                }
                value={editIntegrationClientStatus}
                onChange={onEditIntegrationClientStatusChange}
                data={[
                  { value: 'active', label: 'Active' },
                  { value: 'disabled', label: 'Disabled' },
                ]}
              />
            ) : null}
            <Group justify="space-between">
              <Button
                onClick={onCloseEditIntegrationClient}
                type="button"
                variant="light"
              >
                {t('tenantsPage.cancel')}
              </Button>
              <Button
                loading={
                  isCreateTenantIntegrationClientPending ||
                  isUpdateTenantIntegrationClientPending
                }
                type="submit"
                disabled={
                  !editIntegrationClientDisplayName.trim() ||
                  !editIntegrationClientApplicationId.trim() ||
                  (!selectedIntegrationClient &&
                    !editIntegrationClientId.trim())
                }
              >
                {selectedIntegrationClient ? 'Save client' : 'Create client'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editIntegrationApiKeyOpened}
        onClose={onCloseEditIntegrationApiKey}
        title={selectedIntegrationApiKey ? 'Edit API key' : 'Create API key'}
      >
        <form onSubmit={handleUpsertTenantIntegrationApiKeySubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('tenantsPage.apiKeysInheritTenantIsolationFromTheir')}
            </Text>
            {selectedIntegrationClient ? (
              <div>
                <Text fw={700}>{selectedIntegrationClient.displayName}</Text>
                <Text size="sm" c="dimmed">
                  {selectedIntegrationClient.clientId}
                </Text>
              </div>
            ) : null}
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.label')}
                  help="Operator-friendly name for this secret, such as primary, staging, or rotated-2026-05."
                />
              }
              placeholder={t('tenantsPage.primaryKey')}
              value={editIntegrationApiKeyLabel}
              onChange={(event) =>
                onEditIntegrationApiKeyLabelChange(event.currentTarget.value)
              }
            />
            <MultiSelect
              label={
                <FieldLabel
                  label={t('tenantsPage.scopes2')}
                  help="Delegated subset for this key. The API copies the client ceiling only when scopes are omitted; an explicit empty selection grants no capability."
                />
              }
              description={t(
                'tenantsPage.selectTheDelegatedSubsetNewKeysDefault',
              )}
              searchable={false}
              value={editIntegrationApiKeyScopes}
              onChange={onEditIntegrationApiKeyScopesChange}
              data={(selectedIntegrationClient?.scopes ?? []).map((scope) => ({
                value: scope,
                label: scope,
              }))}
            />
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.expiresAt')}
                  help="Optional expiry date and time after which this API key should no longer authenticate."
                />
              }
              type="datetime-local"
              value={editIntegrationApiKeyExpiresAt}
              onChange={(event) =>
                onEditIntegrationApiKeyExpiresAtChange(
                  event.currentTarget.value,
                )
              }
            />
            {selectedIntegrationApiKey ? (
              <Select
                label={
                  <FieldLabel
                    label={t('tenantsPage.status')}
                    help="Disabled keys remain auditable but can no longer be used."
                  />
                }
                value={editIntegrationApiKeyStatus}
                onChange={onEditIntegrationApiKeyStatusChange}
                data={[
                  { value: 'active', label: 'Active' },
                  { value: 'disabled', label: 'Disabled' },
                ]}
              />
            ) : null}
            {selectedIntegrationApiKey ? (
              <Alert
                color="blue"
                variant="light"
                title={t('tenantsPage.rotation')}
              >
                {t(
                  'tenantsPage.rotationInvalidatesThePreviousSecretAndReveals',
                )}
              </Alert>
            ) : null}
            <Group justify="space-between">
              <Group gap="sm">
                <Button
                  onClick={onCloseEditIntegrationApiKey}
                  type="button"
                  variant="light"
                >
                  {t('tenantsPage.cancel')}
                </Button>
                {selectedIntegrationApiKey ? (
                  <Button
                    type="button"
                    variant="subtle"
                    loading={isRotateTenantIntegrationApiKeyPending}
                    onClick={handleRotateTenantIntegrationApiKey}
                  >
                    {t('tenantsPage.rotateKey')}
                  </Button>
                ) : null}
              </Group>
              <Button
                loading={
                  isCreateTenantIntegrationApiKeyPending ||
                  isUpdateTenantIntegrationApiKeyPending
                }
                type="submit"
                disabled={!editIntegrationApiKeyLabel.trim()}
              >
                {selectedIntegrationApiKey ? 'Save key' : 'Create key'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editModelAccessRuleOpened}
        onClose={onCloseEditModelAccessRule}
        title={
          selectedModelAccessRule
            ? 'Edit model access rule'
            : 'Add model access rule'
        }
      >
        <form onSubmit={handleUpsertTenantModelAccessRuleSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {t('tenantsPage.rulesAreEvaluatedByDescendingPriorityAt')}
            </Text>
            <Select
              label={
                <FieldLabel
                  label={t('tenantsPage.provider')}
                  help="The provider family this rule applies to, such as OpenAI or OpenRouter."
                />
              }
              value={editModelRuleProviderId}
              onChange={onEditModelRuleProviderIdChange}
              data={[
                { value: 'anthropic', label: 'Anthropic' },
                { value: 'google', label: 'Google Gemini' },
                { value: 'groq', label: 'Groq' },
                { value: 'nanogpt', label: 'NanoGPT' },
                { value: 'ollama', label: 'Ollama' },
                { value: 'openai', label: 'OpenAI' },
                { value: 'openrouter', label: 'OpenRouter' },
                { value: 'xai', label: 'xAI Grok' },
              ]}
            />
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.modelPattern')}
                  help="Pattern matched against provider model IDs, for example meta-llama/* or gpt-4.1."
                />
              }
              placeholder={t('tenantsPage.metaLlama')}
              value={editModelRulePattern}
              onChange={(event) =>
                onEditModelRulePatternChange(event.currentTarget.value)
              }
            />
            <Group grow>
              <Select
                label={
                  <FieldLabel
                    label={t('tenantsPage.capability')}
                    help="The capability surface this rule governs, such as text or image."
                  />
                }
                value={editModelRuleCapability}
                onChange={onEditModelRuleCapabilityChange}
                data={[
                  { value: 'text', label: 'Text' },
                  { value: 'image', label: 'Image' },
                  { value: 'stt', label: 'STT' },
                  { value: 'tts', label: 'TTS' },
                  { value: 'embedding', label: 'Embedding' },
                ]}
              />
              <Select
                label={
                  <FieldLabel
                    label={t('tenantsPage.effect')}
                    help="Allow grants access when matched. Deny blocks access and wins ties at the same priority."
                  />
                }
                value={editModelRuleEffect}
                onChange={onEditModelRuleEffectChange}
                data={[
                  { value: 'allow', label: 'Allow' },
                  { value: 'deny', label: 'Deny' },
                ]}
              />
            </Group>
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.priority')}
                  help="Rules are evaluated by descending priority. Higher numbers win first."
                />
              }
              value={editModelRulePriority}
              onChange={(event) =>
                onEditModelRulePriorityChange(event.currentTarget.value)
              }
            />
            <Group grow>
              <TextInput
                label={t('tenantsPage.maxInputTokens')}
                value={editModelRuleMaxInputTokens}
                onChange={(event) =>
                  onEditModelRuleMaxInputTokensChange(event.currentTarget.value)
                }
              />
              <TextInput
                label={t('tenantsPage.maxOutputTokens')}
                value={editModelRuleMaxOutputTokens}
                onChange={(event) =>
                  onEditModelRuleMaxOutputTokensChange(
                    event.currentTarget.value,
                  )
                }
              />
            </Group>
            <Group grow>
              <TextInput
                label={t('tenantsPage.maxImagesRequest')}
                value={editModelRuleMaxImagesPerRequest}
                onChange={(event) =>
                  onEditModelRuleMaxImagesPerRequestChange(
                    event.currentTarget.value,
                  )
                }
              />
              <TextInput
                label={t('tenantsPage.maxResolution')}
                placeholder="1024x1024"
                value={editModelRuleMaxResolution}
                onChange={(event) =>
                  onEditModelRuleMaxResolutionChange(event.currentTarget.value)
                }
              />
            </Group>
            <Group justify="space-between">
              <Group gap="sm">
                <Button
                  onClick={onCloseEditModelAccessRule}
                  type="button"
                  variant="light"
                >
                  {t('tenantsPage.cancel')}
                </Button>
                {selectedModelAccessRule ? (
                  <Button
                    color="red"
                    variant="light"
                    type="button"
                    loading={isDeleteTenantModelAccessRulePending}
                    onClick={handleDeleteTenantModelAccessRule}
                  >
                    {t('tenantsPage.delete')}
                  </Button>
                ) : null}
              </Group>
              <Button
                loading={
                  isCreateTenantModelAccessRulePending ||
                  isUpdateTenantModelAccessRulePending
                }
                type="submit"
                disabled={!editModelRulePattern.trim()}
              >
                {selectedModelAccessRule
                  ? t('tenantsPage.saveRule')
                  : t('tenantsPage.createRule')}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editProviderConfigurationOpened}
        onClose={onCloseEditProviderConfiguration}
        title={t('tenantsPage.providerConfiguration')}
      >
        <form onSubmit={handleUpdateTenantProviderConfigurationSubmit}>
          <Stack gap="md">
            {selectedProviderConfiguration ? (
              <div>
                <Text fw={700}>
                  {selectedProviderConfiguration.providerDisplayName}
                </Text>
                <Text size="sm" c="dimmed">
                  {selectedProviderConfiguration.providerId}
                </Text>
              </div>
            ) : null}
            <Card withBorder radius="md" padding="md">
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fw={700}>
                      {t('tenantsPage.tenantProviderCredential')}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {t(
                        'tenantsPage.encryptedCredentialUsedByServiceOnlyWorkloads',
                      )}
                    </Text>
                  </div>
                  <Badge
                    color={selectedTenantProviderCredential ? 'teal' : 'yellow'}
                    variant="light"
                  >
                    {selectedTenantProviderCredential
                      ? t('tenantsPage.configured')
                      : t('tenantsPage.notConfigured')}
                  </Badge>
                </Group>
                {selectedTenantProviderCredential ? (
                  <Text size="sm">
                    {t('tenantsPage.scopeTENANTHint')}{' '}
                    {selectedTenantProviderCredential.maskedHint ??
                      t('tenantsPage.hidden')}{' '}
                    {t('tenantsPage.status2')}{' '}
                    {selectedTenantProviderCredential.isActive
                      ? t('tenantsPage.active')
                      : t('tenantsPage.disabled')}
                  </Text>
                ) : null}
                <TextInput
                  label={t('tenantsPage.credentialLabel')}
                  value={tenantCredentialLabel}
                  onChange={(event) =>
                    onTenantCredentialLabelChange(event.currentTarget.value)
                  }
                />
                <PasswordInput
                  label={
                    selectedTenantProviderCredential
                      ? t('tenantsPage.replacementApiToken')
                      : t('tenantsPage.apiToken')
                  }
                  description={
                    selectedTenantProviderCredential
                      ? t('tenantsPage.keepEncryptedToken')
                      : t('tenantsPage.encryptedNeverReturned')
                  }
                  value={tenantCredentialApiToken}
                  onChange={(event) =>
                    onTenantCredentialApiTokenChange(event.currentTarget.value)
                  }
                />
                <TextInput
                  label={t('tenantsPage.providerBaseURLOptional')}
                  description={t('tenantsPage.useForACustomOrLocalProvider')}
                  value={tenantCredentialBaseUrl}
                  onChange={(event) =>
                    onTenantCredentialBaseUrlChange(event.currentTarget.value)
                  }
                />
                <Group justify="space-between">
                  {selectedTenantProviderCredential ? (
                    <Group gap="xs">
                      <Button
                        variant="subtle"
                        type="button"
                        loading={isToggleTenantProviderCredentialPending}
                        onClick={handleToggleTenantProviderCredential}
                      >
                        {selectedTenantProviderCredential.isActive
                          ? t('tenantsPage.disable')
                          : t('tenantsPage.enable')}
                      </Button>
                      <Button
                        color="red"
                        variant="subtle"
                        type="button"
                        loading={isDeleteTenantProviderCredentialPending}
                        onClick={handleDeleteTenantProviderCredential}
                      >
                        {t('tenantsPage.deleteCredential')}
                      </Button>
                    </Group>
                  ) : (
                    <span />
                  )}
                  <Button
                    type="button"
                    loading={isSaveTenantProviderCredentialPending}
                    disabled={
                      !tenantCredentialLabel.trim() ||
                      (!selectedTenantProviderCredential &&
                        !tenantCredentialApiToken.trim() &&
                        !tenantCredentialBaseUrl.trim())
                    }
                    onClick={handleSaveTenantProviderCredential}
                  >
                    {selectedTenantProviderCredential
                      ? t('tenantsPage.updateCredential')
                      : t('tenantsPage.saveCredential')}
                  </Button>
                </Group>
              </Stack>
            </Card>
            <Switch
              checked={editProviderEnabled}
              label={
                <FieldLabel
                  label={t('tenantsPage.providerEnabledForThisTenant')}
                  help={t('tenantsPage.providerEnabledHelp')}
                />
              }
              onChange={(event) =>
                onEditProviderEnabledChange(event.currentTarget.checked)
              }
            />
            <Select
              label={
                <FieldLabel
                  label={t('tenantsPage.credentialMode')}
                  help={t('tenantsPage.credentialModeHelp')}
                />
              }
              value={editProviderCredentialMode}
              onChange={onEditProviderCredentialModeChange}
              data={[
                { value: 'hybrid', label: 'Hybrid' },
                { value: 'tenant_byok', label: 'Tenant BYOK' },
                { value: 'user_byok', label: 'User BYOK' },
                { value: 'platform_default', label: 'Platform default' },
              ]}
            />
            <Switch
              checked={editProviderPreferUserCredentials}
              label={
                <FieldLabel
                  label={t('tenantsPage.preferUserCredentials')}
                  help="When hybrid resolution is active, try user BYOK credentials before tenant defaults."
                />
              }
              disabled={
                editProviderCredentialMode === 'platform_default' ||
                editProviderCredentialMode === 'tenant_byok' ||
                editProviderCredentialMode === 'user_byok'
              }
              onChange={(event) =>
                onEditProviderPreferUserCredentialsChange(
                  event.currentTarget.checked,
                )
              }
            />
            <Switch
              checked={editProviderAllowTenantFallback}
              label={
                <FieldLabel
                  label={t('tenantsPage.allowTenantFallback')}
                  help="If user credentials are missing or not allowed, fall back to a tenant-scoped credential when possible."
                />
              }
              disabled={
                editProviderCredentialMode === 'platform_default' ||
                editProviderCredentialMode === 'tenant_byok'
              }
              onChange={(event) =>
                onEditProviderAllowTenantFallbackChange(
                  event.currentTarget.checked,
                )
              }
            />
            <Switch
              checked={editProviderAllowPlatformFallback}
              label={
                <FieldLabel
                  label={t('tenantsPage.allowPlatformFallback')}
                  help="Legacy interactive-request policy. Structured Evaluation service identities ignore this setting and require a tenant credential."
                />
              }
              disabled={editProviderCredentialMode === 'platform_default'}
              onChange={(event) =>
                onEditProviderAllowPlatformFallbackChange(
                  event.currentTarget.checked,
                )
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.defaultTextModel')}
                  help="Tenant default model used for text generation when the caller does not specify one."
                />
              }
              placeholder={t('tenantsPage.openaiGpt41')}
              value={editProviderDefaultTextModel}
              onChange={(event) =>
                onEditProviderDefaultTextModelChange(event.currentTarget.value)
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label={t('tenantsPage.defaultImageModel')}
                  help="Tenant default model used for image generation or edits when the caller does not specify one."
                />
              }
              placeholder={t('tenantsPage.gptImage1')}
              value={editProviderDefaultImageModel}
              onChange={(event) =>
                onEditProviderDefaultImageModelChange(event.currentTarget.value)
              }
            />
            {testTenantProviderConfigurationResult ? (
              <Alert
                color={
                  testTenantProviderConfigurationResult.canResolve
                    ? 'teal'
                    : 'yellow'
                }
                variant="light"
                title={t('tenantsPage.resolutionPreview')}
              >
                {testTenantProviderConfigurationResult.message}
              </Alert>
            ) : null}
            <Group justify="space-between">
              <Button
                type="button"
                variant="subtle"
                loading={isTestTenantProviderConfigurationPending}
                onClick={handleTestTenantProviderConfiguration}
              >
                {t('tenantsPage.testConfiguration')}
              </Button>
              <Group gap="sm">
                <Button
                  onClick={onCloseEditProviderConfiguration}
                  type="button"
                  variant="light"
                >
                  {t('tenantsPage.cancel')}
                </Button>
                <Button
                  loading={isUpdateTenantProviderConfigurationPending}
                  type="submit"
                >
                  {t('tenantsPage.saveConfiguration')}
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

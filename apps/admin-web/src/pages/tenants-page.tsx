import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Grid,
  Group,
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
import { IconHelpCircle } from '@tabler/icons-react';
import { useState } from 'react';

import { PageHeader } from '../components/page-header';
import { useTenantsController } from '../features/tenants/hooks/use-tenants-controller';

function HelpTooltip({ text }: { text: string }) {
  return (
    <Tooltip label={text} multiline w={280} withArrow>
      <ActionIcon
        aria-label="More information"
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

function SectionTitle({
  title,
  help,
}: {
  title: string;
  help: string;
}) {
  return (
    <Group gap="xs">
      <Title order={3}>{title}</Title>
      <HelpTooltip text={help} />
    </Group>
  );
}

function FieldLabel({
  label,
  help,
}: {
  label: string;
  help: string;
}) {
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
    handleCreateTenantSubmit,
    handleUpsertTenantIntegrationApiKeySubmit,
    handleUpsertTenantIntegrationClientSubmit,
    handleCreateTenantUserSubmit,
    handleDeleteTenantModelAccessRule,
    handleTestTenantProviderConfiguration,
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
    updateGlobalRolesError,
  } = useTenantsController();
  const [activeTab, setActiveTab] = useState<string>('settings');

  return (
    <>
      <PageHeader
        title="Tenant Control"
        description="Global super-admin surface for isolated workspace provisioning, tenant policy tuning, and cross-tenant visibility."
        context={activeTenantLabel}
        aside={<Button onClick={onOpenCreate}>Create tenant</Button>}
      />

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, xl: 5 }}>
          <Card className="section-card">
            <Group justify="space-between" mb="md">
              <Title order={3}>Tenants</Title>
              <Badge variant="light">
                {tenantCards.length} total
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
                        Memberships
                      </Text>
                      <Text fw={600}>{tenant.membershipCount}</Text>
                    </div>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        User override
                      </Text>
                      <Text fw={600}>
                        {tenant.allowUserCredentialOverride ? 'Allowed' : 'Disabled'}
                      </Text>
                    </div>
                  </SimpleGrid>
                </Card>
              ))}
              {!tenantCards.length && !tenantsQuery.isPending ? (
                <Text c="dimmed" size="sm">
                  No tenants found yet.
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
              <Tabs.Tab value="settings">Tenant Settings</Tabs.Tab>
              <Tabs.Tab value="memberships">Memberships</Tabs.Tab>
              <Tabs.Tab value="policies">Policies &amp; Limits</Tabs.Tab>
              <Tabs.Tab value="providers">Provider Configurations</Tabs.Tab>
              <Tabs.Tab value="integration-clients">
                Integration Clients
              </Tabs.Tab>
              <Tabs.Tab value="model-rules">Model Access Rules</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="settings">
            <Card className="section-card">
              <Group justify="space-between" mb="md">
                <SectionTitle
                  title="Tenant Settings"
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
                          label="Display name"
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
                          label="Status"
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
                          label="Allow user credential override"
                          help="If enabled, a member's own BYOK credential can override the tenant default when the provider configuration also permits it."
                        />
                      }
                      description="When enabled, user-scoped BYOK credentials can override the tenant default."
                      onChange={(event) =>
                        onEditAllowOverrideChange(event.currentTarget.checked)
                      }
                    />
                    <Group justify="flex-end">
                      <Button loading={isUpdatePending} type="submit">
                        Save tenant
                      </Button>
                    </Group>
                  </Stack>
                </form>
              ) : (
                <Text c="dimmed" size="sm">
                  Select a tenant to inspect or update its control-plane settings.
                </Text>
              )}
            </Card>
            </Tabs.Panel>

            <Tabs.Panel value="memberships">
            <Card className="section-card">
              <Group justify="space-between" mb="md">
                <SectionTitle
                  title="Memberships"
                  help="Defines which global users belong to this tenant and which tenant-scoped roles they hold here. A user may appear in multiple tenants with different roles."
                />
                <Group gap="sm">
                  {selectedTenant ? (
                    <Badge variant="light">{memberships.length} members</Badge>
                  ) : null}
                  <Button
                    size="xs"
                    onClick={onOpenCreateMember}
                    disabled={!selectedTenant}
                  >
                    Add member
                  </Button>
                </Group>
              </Group>
              {selectedTenant ? (
                <Table.ScrollContainer minWidth={760}>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>User</Table.Th>
                        <Table.Th>Tenant roles</Table.Th>
                        <Table.Th>Global roles</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {memberships.map((membership) => (
                        <Table.Tr key={`${membership.tenantId}-${membership.userUuid}`}>
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
                                  <Badge key={role} color="grape" variant="light">
                                    {role}
                                  </Badge>
                                ))
                              ) : (
                                <Text size="sm" c="dimmed">
                                  None
                                </Text>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={membership.status === 'active' ? 'moss' : 'red'}
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
                                {membership.globalRoles.includes('super_admin')
                                  ? 'Protected'
                                  : 'Edit member'}
                              </Button>
                              <Button
                                size="xs"
                                variant="subtle"
                                onClick={() => onOpenEditGlobalRoles(membership)}
                              >
                                Global access
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
                  Select a tenant to inspect its membership boundary.
                </Text>
              )}
              {selectedTenant && !memberships.length && !membershipsQuery.isPending ? (
                <Text c="dimmed" size="sm" mt="md">
                  This tenant has no memberships yet.
                </Text>
              ) : null}
            </Card>
            </Tabs.Panel>

            <Tabs.Panel value="policies">
            <Card className="section-card">
              <Group justify="space-between" mb="md">
                <SectionTitle
                  title="Policies & Limits"
                  help="Operational guardrails like request rates, budget ceilings, token ceilings, logging posture, and retention defaults. Some fields are enforced now, while others are persisted for future hardening."
                />
                {selectedTenant ? (
                  <Badge variant="light">App-enforced</Badge>
                ) : null}
              </Group>
              {selectedTenant ? (
                <form onSubmit={handleUpdateTenantPolicySubmit}>
                  <Stack gap="md">
                    <Text size="sm" c="dimmed">
                      The gateway currently enforces request windows, monthly
                      budget, monthly token totals, and monthly image request
                      counts from the usage ledger. Logging and retention fields
                      are persisted now so we can harden the next layer without
                      redesigning the contract.
                    </Text>
                    <Group grow>
                      <TextInput
                        label={
                          <FieldLabel
                            label="Monthly budget (USD)"
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
                            label="Retention days"
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
                            label="Requests per minute"
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
                            label="Tokens per minute"
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
                        label="Daily request limit"
                        value={editPolicyDailyRequestLimit}
                        onChange={(event) =>
                          onEditPolicyDailyRequestLimitChange(
                            event.currentTarget.value,
                          )
                        }
                      />
                      <TextInput
                        label="Monthly request limit"
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
                        label="Monthly token limit"
                        value={editPolicyMonthlyTokenLimit}
                        onChange={(event) =>
                          onEditPolicyMonthlyTokenLimitChange(
                            event.currentTarget.value,
                          )
                        }
                      />
                      <TextInput
                        label="Image requests per month"
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
                        label="Max input tokens"
                        value={editPolicyMaxInputTokens}
                        onChange={(event) =>
                          onEditPolicyMaxInputTokensChange(
                            event.currentTarget.value,
                          )
                        }
                      />
                      <TextInput
                        label="Max output tokens"
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
                        label="Allow prompt logging"
                        onChange={(event) =>
                          onEditPolicyAllowPromptLoggingChange(
                            event.currentTarget.checked,
                          )
                        }
                      />
                      <Switch
                        checked={editPolicyAllowResponseLogging}
                        label="Allow response logging"
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
                        Save policy
                      </Button>
                    </Group>
                  </Stack>
                </form>
              ) : (
                <Text c="dimmed" size="sm">
                  Select a tenant to configure its cost guardrails, quota
                  thresholds, and logging posture.
                </Text>
              )}
              {selectedTenant && !tenantPolicy && !tenantPolicyQuery.isPending ? (
                <Text c="dimmed" size="sm" mt="md">
                  The gateway is currently using implicit defaults for this
                  tenant.
                </Text>
              ) : null}
            </Card>
            </Tabs.Panel>

            <Tabs.Panel value="providers">
            <Card className="section-card">
              <Group justify="space-between" mb="md">
                <SectionTitle
                  title="Provider Configurations"
                  help="Controls whether a provider is available to this tenant, which default models it uses, and how credentials are resolved between platform, tenant, and user scopes."
                />
                {selectedTenant ? (
                  <Badge variant="light">{providerConfigurations.length} providers</Badge>
                ) : null}
              </Group>
              {selectedTenant ? (
                <Table.ScrollContainer minWidth={760}>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Provider</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Credential path</Table.Th>
                        <Table.Th>Defaults</Table.Th>
                        <Table.Th>Actions</Table.Th>
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
                                {configuration.enabled ? 'enabled' : 'disabled'}
                              </Badge>
                              <Badge
                                color={
                                  configuration.providerStatus === 'active'
                                    ? 'blue'
                                    : 'gray'
                                }
                                variant="outline"
                              >
                                platform {configuration.providerStatus}
                              </Badge>
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Text fw={600}>{configuration.credentialMode}</Text>
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
                              Text:{' '}
                              {configuration.defaultTextModel ?? 'No tenant default'}
                            </Text>
                            <Text size="sm">
                              Image:{' '}
                              {configuration.defaultImageModel ?? 'No tenant default'}
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
                              Edit config
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Text c="dimmed" size="sm">
                  Select a tenant to manage provider enablement, defaults, and
                  credential routing.
                </Text>
              )}
            {selectedTenant &&
              !providerConfigurations.length &&
              !providerConfigurationsQuery.isPending ? (
                <Text c="dimmed" size="sm" mt="md">
                  This tenant has no provider configurations yet.
                </Text>
              ) : null}
            </Card>
            </Tabs.Panel>

            <Tabs.Panel value="integration-clients">
            <Card className="section-card">
              <Group justify="space-between" mb="md">
                <SectionTitle
                  title="Integration Clients"
                  help="Technical identities for apps like Open WebUI. They are tenant-bound, scoped, and own one or more rotatable API keys."
                />
                <Group gap="sm">
                  {selectedTenant ? (
                    <Badge variant="light">{integrationClients.length} clients</Badge>
                  ) : null}
                  <Button
                    size="xs"
                    onClick={onOpenCreateIntegrationClient}
                    disabled={!selectedTenant}
                  >
                    Add client
                  </Button>
                </Group>
              </Group>
              {selectedTenant ? (
                <Stack gap="md">
                  {revealedIntegrationApiKey ? (
                    <Alert
                      color="yellow"
                      variant="light"
                      title="Copy this API key now"
                    >
                      <Stack gap="xs">
                        <Text size="sm">
                          This secret for{' '}
                          <Text span fw={700}>
                            {revealedIntegrationApiKey.clientDisplayName}
                          </Text>{' '}
                          /{' '}
                          <Text span fw={700}>
                            {revealedIntegrationApiKey.label}
                          </Text>{' '}
                          is shown only once.
                        </Text>
                        <Code block>{revealedIntegrationApiKey.apiKey}</Code>
                        <Group justify="flex-end">
                          <Button
                            size="xs"
                            variant="light"
                            onClick={onDismissRevealedIntegrationApiKey}
                          >
                            Dismiss
                          </Button>
                        </Group>
                      </Stack>
                    </Alert>
                  ) : null}
                  <Table.ScrollContainer minWidth={860}>
                    <Table highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Client</Table.Th>
                          <Table.Th>Identity</Table.Th>
                          <Table.Th>Scopes</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th>Actions</Table.Th>
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
                                App: {client.applicationId}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">
                                Default user:{' '}
                                {client.defaultUserDisplayName ?? 'No default user'}
                              </Text>
                              <Text size="sm" c="dimmed">
                                Forwarded identity:{' '}
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
                                  color={client.status === 'active' ? 'moss' : 'red'}
                                  variant="light"
                                >
                                  {client.status}
                                </Badge>
                                <Badge variant="outline">
                                  {client.apiKeyCount} keys
                                </Badge>
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={() => onSelectIntegrationClient(client)}
                                >
                                  View keys
                                </Button>
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() => onOpenEditIntegrationClient(client)}
                                >
                                  Edit client
                                </Button>
                                <Button
                                  size="xs"
                                  onClick={() => onOpenCreateIntegrationApiKey(client)}
                                >
                                  Create key
                                </Button>
                              </Group>
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
                            API keys for {selectedIntegrationClient.displayName}
                          </Text>
                          <Text size="sm" c="dimmed">
                            {selectedIntegrationClient.clientId}
                          </Text>
                        </div>
                        <Button
                          size="xs"
                          onClick={() =>
                            onOpenCreateIntegrationApiKey(selectedIntegrationClient)
                          }
                        >
                          Create key
                        </Button>
                      </Group>
                      <Table.ScrollContainer minWidth={760}>
                        <Table highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Label</Table.Th>
                              <Table.Th>Hint</Table.Th>
                              <Table.Th>Scopes</Table.Th>
                              <Table.Th>Status</Table.Th>
                              <Table.Th>Last used</Table.Th>
                              <Table.Th>Actions</Table.Th>
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
                                    color={apiKey.status === 'active' ? 'moss' : 'red'}
                                    variant="light"
                                  >
                                    {apiKey.status}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">
                                    {apiKey.lastUsedAt
                                      ? new Date(apiKey.lastUsedAt).toLocaleString()
                                      : 'Never'}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      onClick={() =>
                                        onOpenEditIntegrationApiKey(
                                          selectedIntegrationClient,
                                          apiKey,
                                        )
                                      }
                                    >
                                      Edit key
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="subtle"
                                      onClick={() =>
                                        onOpenEditIntegrationApiKey(
                                          selectedIntegrationClient,
                                          apiKey,
                                        )
                                      }
                                    >
                                      Select
                                    </Button>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </Table.ScrollContainer>
                      {!integrationApiKeys.length &&
                      !integrationApiKeysQuery.isPending ? (
                        <Text c="dimmed" size="sm" mt="md">
                          This integration client has no API keys yet.
                        </Text>
                      ) : null}
                    </Card>
                  ) : (
                    <Text c="dimmed" size="sm">
                      Select an integration client to inspect and rotate its API
                      keys.
                    </Text>
                  )}
                </Stack>
              ) : (
                <Text c="dimmed" size="sm">
                  Select a tenant to manage tenant-scoped technical clients and
                  their API keys.
                </Text>
              )}
              {selectedTenant &&
              !integrationClients.length &&
              !integrationClientsQuery.isPending ? (
                <Text c="dimmed" size="sm" mt="md">
                  This tenant has no integration clients yet.
                </Text>
              ) : null}
            </Card>
            </Tabs.Panel>

            <Tabs.Panel value="model-rules">
            <Card className="section-card">
              <Group justify="space-between" mb="md">
                <SectionTitle
                  title="Model Access Rules"
                  help="Allow or deny rules for provider models, evaluated by priority. At equal priority, deny wins over allow."
                />
                <Group gap="sm">
                  {selectedTenant ? (
                    <Badge variant="light">{modelAccessRules.length} rules</Badge>
                  ) : null}
                  <Button
                    size="xs"
                    onClick={onOpenCreateModelAccessRule}
                    disabled={!selectedTenant}
                  >
                    Add rule
                  </Button>
                </Group>
              </Group>
              {selectedTenant ? (
                <Table.ScrollContainer minWidth={860}>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Provider</Table.Th>
                        <Table.Th>Pattern</Table.Th>
                        <Table.Th>Capability</Table.Th>
                        <Table.Th>Effect</Table.Th>
                        <Table.Th>Limits</Table.Th>
                        <Table.Th>Priority</Table.Th>
                        <Table.Th>Actions</Table.Th>
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
                              In: {rule.maxInputTokens ?? 'n/a'} / Out:{' '}
                              {rule.maxOutputTokens ?? 'n/a'}
                            </Text>
                            <Text size="sm">
                              Images: {rule.maxImagesPerRequest ?? 'n/a'} / Res:{' '}
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
                              Edit rule
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Text c="dimmed" size="sm">
                  Select a tenant to control which models and capabilities are
                  exposed.
                </Text>
              )}
              {selectedTenant &&
              !modelAccessRules.length &&
              !modelAccessRulesQuery.isPending ? (
                <Text c="dimmed" size="sm" mt="md">
                  No model access rules are defined yet. The current behavior is
                  allow-by-default unless a matching rule denies access.
                </Text>
              ) : null}
            </Card>
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>
      </Grid>

      <Modal opened={createOpened} onClose={onCloseCreate} title="Create tenant">
        <form onSubmit={handleCreateTenantSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Provision a new tenant isolation boundary with a stable slug and an
              explicit BYOK override policy.
            </Text>
            <TextInput
              label={
                <FieldLabel
                  label="Slug"
                  help="Stable human-readable identifier used in URLs, ops, and tenant references. It should remain stable after creation."
                />
              }
              placeholder="customer-acme"
              value={createSlug}
              onChange={(event) => onCreateSlugChange(event.currentTarget.value)}
            />
            <TextInput
              label={
                <FieldLabel
                  label="Display name"
                  help="Friendly tenant name shown to operators throughout the control plane."
                />
              }
              placeholder="Customer Acme"
              value={createDisplayName}
              onChange={(event) =>
                onCreateDisplayNameChange(event.currentTarget.value)
              }
            />
            <Switch
              checked={createAllowOverride}
              label={
                <FieldLabel
                  label="Allow user credential override"
                  help="Sets the tenant default for whether members may use their own BYOK credential instead of the tenant default."
                />
              }
              onChange={(event) =>
                onCreateAllowOverrideChange(event.currentTarget.checked)
              }
            />
            <Group justify="space-between">
              <Button onClick={onCloseCreate} type="button" variant="light">
                Cancel
              </Button>
              <Button
                loading={isCreatePending}
                type="submit"
                disabled={!createSlug.trim() || !createDisplayName.trim()}
              >
                Create tenant
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={createMemberOpened}
        onClose={onCloseCreateMember}
        title="Add tenant member"
      >
        <form onSubmit={handleCreateTenantUserSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Attach an existing global user by email, or provision a new global
              user and add it to this tenant with roles such as `tenant_admin`.
            </Text>
            <TextInput
              label={
                <FieldLabel
                  label="Display name"
                  help="Friendly name for the member when provisioning a brand-new global account."
                />
              }
              description="Optional when attaching an existing global user. Required only when provisioning a brand-new account."
              value={createMemberDisplayName}
              onChange={(event) =>
                onCreateMemberDisplayNameChange(event.currentTarget.value)
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label="Email"
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
                  label="Temporary password"
                  help="Only needed when creating a brand-new global account. Existing users keep their current password."
                />
              }
              description="Optional when attaching an existing global user. Required only when provisioning a brand-new account."
              value={createMemberPassword}
              onChange={(event) =>
                onCreateMemberPasswordChange(event.currentTarget.value)
              }
            />
            <MultiSelect
              label={
                <FieldLabel
                  label="Tenant roles"
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
              <Button onClick={onCloseCreateMember} type="button" variant="light">
                Cancel
              </Button>
              <Button
                loading={isCreateTenantUserPending}
                type="submit"
                disabled={!createMemberEmail.trim()}
              >
                Add member
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editMemberOpened}
        onClose={onCloseEditMember}
        title="Edit tenant member"
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
                  label="Tenant roles"
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
                  label="Status"
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
                Cancel
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
        title="Global access"
      >
        <form onSubmit={handleUpdateGlobalRolesSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Global roles are control-plane privileges and are managed
              separately from tenant memberships.
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
              <Alert color="grape" variant="light" title="Protected account">
                Your current session is using this `super_admin` account. You
                cannot remove your own global access from this screen.
              </Alert>
            ) : null}
            {updateGlobalRolesError ? (
              <Alert color="red" variant="light" title="Update failed">
                {updateGlobalRolesError}
              </Alert>
            ) : null}
            <MultiSelect
              label={
                <FieldLabel
                  label="Global roles"
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
                Cancel
              </Button>
              <Button loading={isUpdateGlobalRolesPending} type="submit">
                Save global access
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
              Technical clients are tenant-bound roots of trust for Open WebUI
              and similar integrations. Scopes stay narrow by default.
            </Text>
            <TextInput
              disabled={Boolean(selectedIntegrationClient)}
              label={
                <FieldLabel
                  label="Client ID"
                  help="Stable technical identifier for this integration client. It is part of the trust boundary and should not be changed casually."
                />
              }
              placeholder="open-webui-demo"
              value={editIntegrationClientId}
              onChange={(event) =>
                onEditIntegrationClientIdChange(event.currentTarget.value)
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label="Display name"
                  help="Friendly name shown to operators for this technical client."
                />
              }
              placeholder="Open WebUI Demo"
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
                  label="Application ID"
                  help="Human-readable application grouping such as open-webui or creative-studio."
                />
              }
              placeholder="open-webui"
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
                  label="Default user"
                  help="Optional tenant member used when the integration does not forward a trusted human identity."
                />
              }
              placeholder="Optional tenant user"
              data={integrationClientMemberOptions}
              value={editIntegrationClientDefaultUserUuid || null}
              onChange={(value) =>
                onEditIntegrationClientDefaultUserUuidChange(value ?? '')
              }
            />
            <MultiSelect
              label={
                <FieldLabel
                  label="Scopes"
                  help="Capabilities this technical client may call through the gateway. Keep this as narrow as practical."
                />
              }
              searchable={false}
              value={editIntegrationClientScopes}
              onChange={onEditIntegrationClientScopesChange}
              data={[
                { value: 'chat:completion', label: 'chat:completion' },
                { value: 'models:list', label: 'models:list' },
                { value: 'image:generate', label: 'image:generate' },
                { value: 'image:edit', label: 'image:edit' },
              ]}
            />
            <Switch
              checked={editIntegrationClientTrustedForwardedIdentityEnabled}
              label={
                <FieldLabel
                  label="Trust forwarded human identity"
                  help="Allows a trusted proxy to forward a human identity. Only enable this behind a boundary you fully control."
                />
              }
              description="Only enable this behind a trusted proxy boundary."
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
                    label="Status"
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
                Cancel
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
                  (!selectedIntegrationClient && !editIntegrationClientId.trim())
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
              API keys inherit tenant isolation from their integration client and
              can be narrowed further with their own scope set.
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
                  label="Label"
                  help="Operator-friendly name for this secret, such as primary, staging, or rotated-2026-05."
                />
              }
              placeholder="Primary key"
              value={editIntegrationApiKeyLabel}
              onChange={(event) =>
                onEditIntegrationApiKeyLabelChange(event.currentTarget.value)
              }
            />
            <MultiSelect
              label={
                <FieldLabel
                  label="Scopes"
                  help="Optional narrower capability set for this specific key. Leave empty to inherit the integration client's scopes."
                />
              }
              description="Leave empty to inherit the integration client's scopes."
              searchable={false}
              value={editIntegrationApiKeyScopes}
              onChange={onEditIntegrationApiKeyScopesChange}
              data={[
                { value: 'chat:completion', label: 'chat:completion' },
                { value: 'models:list', label: 'models:list' },
                { value: 'image:generate', label: 'image:generate' },
                { value: 'image:edit', label: 'image:edit' },
              ]}
            />
            <TextInput
              label={
                <FieldLabel
                  label="Expires at"
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
                    label="Status"
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
              <Alert color="blue" variant="light" title="Rotation">
                Rotation invalidates the previous secret and reveals a new one
                once.
              </Alert>
            ) : null}
            <Group justify="space-between">
              <Group gap="sm">
                <Button
                  onClick={onCloseEditIntegrationApiKey}
                  type="button"
                  variant="light"
                >
                  Cancel
                </Button>
                {selectedIntegrationApiKey ? (
                  <Button
                    type="button"
                    variant="subtle"
                    loading={isRotateTenantIntegrationApiKeyPending}
                    onClick={handleRotateTenantIntegrationApiKey}
                  >
                    Rotate key
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
        title={selectedModelAccessRule ? 'Edit model access rule' : 'Add model access rule'}
      >
        <form onSubmit={handleUpsertTenantModelAccessRuleSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Rules are evaluated by descending priority. At equal priority,
              `deny` wins over `allow`.
            </Text>
            <Select
              label={
                <FieldLabel
                  label="Provider"
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
                  label="Model pattern"
                  help="Pattern matched against provider model IDs, for example meta-llama/* or gpt-4.1."
                />
              }
              placeholder="meta-llama/*"
              value={editModelRulePattern}
              onChange={(event) =>
                onEditModelRulePatternChange(event.currentTarget.value)
              }
            />
            <Group grow>
              <Select
                label={
                  <FieldLabel
                    label="Capability"
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
                    label="Effect"
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
                  label="Priority"
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
                label="Max input tokens"
                value={editModelRuleMaxInputTokens}
                onChange={(event) =>
                  onEditModelRuleMaxInputTokensChange(event.currentTarget.value)
                }
              />
              <TextInput
                label="Max output tokens"
                value={editModelRuleMaxOutputTokens}
                onChange={(event) =>
                  onEditModelRuleMaxOutputTokensChange(event.currentTarget.value)
                }
              />
            </Group>
            <Group grow>
              <TextInput
                label="Max images / request"
                value={editModelRuleMaxImagesPerRequest}
                onChange={(event) =>
                  onEditModelRuleMaxImagesPerRequestChange(
                    event.currentTarget.value,
                  )
                }
              />
              <TextInput
                label="Max resolution"
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
                  Cancel
                </Button>
                {selectedModelAccessRule ? (
                  <Button
                    color="red"
                    variant="light"
                    type="button"
                    loading={isDeleteTenantModelAccessRulePending}
                    onClick={handleDeleteTenantModelAccessRule}
                  >
                    Delete
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
                {selectedModelAccessRule ? 'Save rule' : 'Create rule'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editProviderConfigurationOpened}
        onClose={onCloseEditProviderConfiguration}
        title="Provider configuration"
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
            <Switch
              checked={editProviderEnabled}
              label={
                <FieldLabel
                  label="Provider enabled for this tenant"
                  help="Turns this provider on or off for the selected tenant, regardless of platform availability."
                />
              }
              onChange={(event) =>
                onEditProviderEnabledChange(event.currentTarget.checked)
              }
            />
            <Select
              label={
                <FieldLabel
                  label="Credential mode"
                  help="Defines whether this tenant resolves credentials from platform defaults, tenant BYOK, user BYOK, or a hybrid chain."
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
                  label="Prefer user credentials"
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
                  label="Allow tenant fallback"
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
                  label="Allow platform fallback"
                  help="Allows fallback to a platform-level credential only when this tenant and provider configuration explicitly permit it."
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
                  label="Default text model"
                  help="Tenant default model used for text generation when the caller does not specify one."
                />
              }
              placeholder="openai/gpt-4.1"
              value={editProviderDefaultTextModel}
              onChange={(event) =>
                onEditProviderDefaultTextModelChange(event.currentTarget.value)
              }
            />
            <TextInput
              label={
                <FieldLabel
                  label="Default image model"
                  help="Tenant default model used for image generation or edits when the caller does not specify one."
                />
              }
              placeholder="gpt-image-1"
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
                title="Resolution preview"
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
                Test configuration
              </Button>
              <Group gap="sm">
                <Button
                  onClick={onCloseEditProviderConfiguration}
                  type="button"
                  variant="light"
                >
                  Cancel
                </Button>
                <Button
                  loading={isUpdateTenantProviderConfigurationPending}
                  type="submit"
                >
                  Save configuration
                </Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

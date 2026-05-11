import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Group,
  Loader,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCopy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { adminApiClient, gatewayApiClient } from '../lib/api-client';
import { copyText } from '../lib/copy-text';
import { useRuntimeConfig } from '../lib/use-runtime-config';
import { useSetupStatus } from '../lib/use-setup-status';
import type {
  SetupBootstrapResult,
  SetupProviderCredentialInput,
  SetupProviderTestResult,
} from '../lib/api-client.types';

type ProviderDraft = SetupProviderCredentialInput & {
  localId: string;
};

type ProviderTestState = {
  status: 'idle' | 'success' | 'error';
  result?: SetupProviderTestResult;
};

function createProviderDraft(): ProviderDraft {
  return {
    localId: crypto.randomUUID(),
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: '',
    baseUrl: '',
    defaultTextModel: '',
    defaultImageModel: '',
  };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setupStatusQuery = useSetupStatus();
  const runtimeConfigQuery = useRuntimeConfig();
  const [setupToken, setSetupToken] = useState('');
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [superAdminDisplayName, setSuperAdminDisplayName] = useState('');
  const [tenantDisplayName, setTenantDisplayName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantSlugTouched, setTenantSlugTouched] = useState(false);
  const [allowUserCredentialOverride, setAllowUserCredentialOverride] =
    useState(true);
  const [providerDrafts, setProviderDrafts] = useState<ProviderDraft[]>([
    createProviderDraft(),
  ]);
  const [providerTests, setProviderTests] = useState<
    Record<string, ProviderTestState>
  >({});
  const [monthlyBudgetUsd, setMonthlyBudgetUsd] = useState('');
  const [requestsPerMinute, setRequestsPerMinute] = useState<number | ''>(60);
  const [tokensPerMinute, setTokensPerMinute] = useState<number | ''>(100000);
  const [retentionDays, setRetentionDays] = useState<number | ''>(30);
  const [allowPromptLogging, setAllowPromptLogging] = useState(false);
  const [allowResponseLogging, setAllowResponseLogging] = useState(false);
  const [openWebUiEnabled, setOpenWebUiEnabled] = useState(true);
  const [openWebUiCreateApiKey, setOpenWebUiCreateApiKey] = useState(true);
  const [openWebUiTrustedIdentity, setOpenWebUiTrustedIdentity] =
    useState(false);
  const [openWebUiClientId, setOpenWebUiClientId] = useState('open-webui');
  const [openWebUiDisplayName, setOpenWebUiDisplayName] = useState('Open WebUI');
  const [openWebUiApplicationId, setOpenWebUiApplicationId] =
    useState('open-webui');
  const [openWebUiApiKeyLabel, setOpenWebUiApiKeyLabel] =
    useState('Primary setup key');
  const [openWebUiScopes, setOpenWebUiScopes] = useState({
    chat: true,
    models: true,
    imageGenerate: false,
    imageEdit: false,
    videoGenerate: false,
  });
  const [bootstrapResult, setBootstrapResult] =
    useState<SetupBootstrapResult | null>(null);
  const providerOptions = useMemo(
    () =>
      (runtimeConfigQuery.data?.supportedProviders ?? []).map((provider) => ({
        value: provider.providerId,
        label: provider.displayName,
      })),
    [runtimeConfigQuery.data?.supportedProviders],
  );

  useEffect(() => {
    if (tenantSlugTouched) {
      return;
    }

    setTenantSlug(slugify(tenantDisplayName));
  }, [tenantDisplayName, tenantSlugTouched]);

  const providerTestMutation = useMutation({
    mutationFn: async ({
      localId,
      payload,
    }: {
      localId: string;
      payload: ProviderDraft;
    }) => {
      const result = await gatewayApiClient.testSetupProvider(setupToken, {
        providerId: payload.providerId,
        apiKey: payload.apiToken?.trim() || undefined,
        baseUrl: payload.baseUrl?.trim() || undefined,
      });

      return { localId, result };
    },
    onSuccess: ({ localId, result }) => {
      setProviderTests((current) => ({
        ...current,
        [localId]: {
          status: result.success ? 'success' : 'error',
          result,
        },
      }));
    },
    onError: (error, variables) => {
      setProviderTests((current) => ({
        ...current,
        [variables.localId]: {
          status: 'error',
          result: {
            success: false,
            providerId: variables.payload.providerId,
            modelTested: null,
            errorCode: 'provider_test_failed',
            errorMessage:
              error instanceof Error ? error.message : 'Provider test failed.',
          },
        },
      }));
    },
  });

  const bootstrapMutation = useMutation({
    mutationFn: () =>
      adminApiClient.bootstrapSetup(setupToken, {
        superAdmin: {
          email: superAdminEmail.trim(),
          password: superAdminPassword,
          displayName: superAdminDisplayName.trim(),
        },
        tenant: {
          slug: tenantSlug.trim(),
          displayName: tenantDisplayName.trim(),
          allowUserCredentialOverride,
        },
        providerCredentials: providerDrafts
          .filter(
            (draft) =>
              draft.providerId.trim() &&
              draft.label.trim() &&
              (draft.apiToken?.trim() || draft.baseUrl?.trim()),
          )
          .map((draft) => ({
            providerId: draft.providerId,
            label: draft.label.trim(),
            apiToken: draft.apiToken?.trim() || undefined,
            baseUrl: draft.baseUrl?.trim() || undefined,
            defaultTextModel: draft.defaultTextModel?.trim() || undefined,
            defaultImageModel: draft.defaultImageModel?.trim() || undefined,
          })),
        tenantPolicy: {
          monthlyBudgetUsd: monthlyBudgetUsd.trim() || undefined,
          requestsPerMinute:
            requestsPerMinute === '' ? undefined : requestsPerMinute,
          tokensPerMinute: tokensPerMinute === '' ? undefined : tokensPerMinute,
          retentionDays: retentionDays === '' ? undefined : retentionDays,
          allowPromptLogging,
          allowResponseLogging,
        },
        openWebUi: openWebUiEnabled
          ? {
              enabled: true,
              clientId: openWebUiClientId.trim() || undefined,
              displayName: openWebUiDisplayName.trim() || undefined,
              applicationId: openWebUiApplicationId.trim() || undefined,
              apiKeyLabel: openWebUiApiKeyLabel.trim() || undefined,
              createApiKey: openWebUiCreateApiKey,
              trustedForwardedIdentityEnabled: openWebUiTrustedIdentity,
              scopes: collectOpenWebUiScopes(openWebUiScopes),
            }
          : {
              enabled: false,
            },
      }),
    onSuccess: async (result) => {
      setBootstrapResult(result);
      await queryClient.invalidateQueries({ queryKey: ['setup-status'] });
    },
  });

  if (setupStatusQuery.isPending || runtimeConfigQuery.isPending) {
    return (
      <Container size="sm" py="xl">
        <Group justify="center" py="xl">
          <Loader color="teal" />
        </Group>
      </Container>
    );
  }

  if (setupStatusQuery.data && !setupStatusQuery.data.setupRequired) {
    return <Navigate to="/login" replace />;
  }

  const hasBasicBootstrapFields =
    setupToken.trim().length > 0 &&
    superAdminEmail.trim().length > 0 &&
    superAdminPassword.length >= 8 &&
    superAdminDisplayName.trim().length > 0 &&
    tenantDisplayName.trim().length > 0 &&
    tenantSlug.trim().length > 0;

  return (
    <Box py="xl">
      <Container size="lg">
        <Stack gap="lg">
          <Paper
            radius="xl"
            p="xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(5,92,86,0.95) 0%, rgba(12,44,63,0.96) 100%)',
              color: 'white',
            }}
          >
            <Stack gap="sm">
              <Badge color="teal" variant="light" w="fit-content">
                First-time setup
              </Badge>
              <Title order={1}>Install and secure your gateway</Title>
              <Text c="rgba(255,255,255,0.82)" maw={760}>
                The CLI prepared the technical secrets. This wizard finishes the
                application bootstrap: first super admin, first tenant, initial
                provider credentials, policy defaults, and optional Open WebUI
                integration.
              </Text>
              <Group gap="sm">
                <Badge variant="outline" color="rgba(255,255,255,0.9)">
                  Version {setupStatusQuery.data?.version ?? 'unknown'}
                </Badge>
                <Badge variant="outline" color="rgba(255,255,255,0.9)">
                  Setup token required
                </Badge>
              </Group>
            </Stack>
          </Paper>

          {bootstrapResult ? (
            <Card radius="xl" p="xl" withBorder>
              <Stack gap="md">
                <Group gap="sm">
                  <IconCheck size={20} />
                  <Title order={2}>Installation completed</Title>
                </Group>
                <Text>
                  The gateway is now bootstrapped for tenant{' '}
                  <strong>{bootstrapResult.tenant.displayName}</strong>. You can
                  continue to sign in as{' '}
                  <strong>{bootstrapResult.superAdmin.email}</strong>.
                </Text>
                {bootstrapResult.openWebUi?.apiKey ? (
                  <Alert color="teal" title="Open WebUI API key">
                    <Stack gap="xs">
                      <Text size="sm">
                        This key is shown once. Store it now before leaving this
                        page.
                      </Text>
                      <Group justify="space-between" wrap="nowrap">
                        <Text ff="monospace" size="sm" truncate>
                          {bootstrapResult.openWebUi.apiKey}
                        </Text>
                        <ActionIcon
                          variant="light"
                          color="teal"
                          onClick={() =>
                            void copyText(bootstrapResult.openWebUi!.apiKey!)
                          }
                          aria-label="Copy Open WebUI API key"
                        >
                          <IconCopy size={16} />
                        </ActionIcon>
                      </Group>
                    </Stack>
                  </Alert>
                ) : null}
                <Group>
                  <Button onClick={() => navigate('/login')}>
                    Continue to sign in
                  </Button>
                </Group>
              </Stack>
            </Card>
          ) : null}

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Card radius="xl" p="xl" withBorder>
              <Stack gap="md">
                <Title order={3}>System check</Title>
                <StatusRow
                  label="Admin API"
                  value="Reachable"
                  tone="good"
                />
                <StatusRow
                  label="Gateway online"
                  value={runtimeConfigQuery.data?.gatewayOnline ? 'Yes' : 'No'}
                  tone={runtimeConfigQuery.data?.gatewayOnline ? 'good' : 'warn'}
                />
                <StatusRow
                  label="Setup required"
                  value={setupStatusQuery.data?.setupRequired ? 'Yes' : 'No'}
                  tone={setupStatusQuery.data?.setupRequired ? 'good' : 'warn'}
                />
              </Stack>
            </Card>

            <Card radius="xl" p="xl" withBorder>
              <Stack gap="md">
                <Title order={3}>Setup access</Title>
                <Text size="sm" c="dimmed">
                  Paste the one-time setup token printed by `pnpm setup:init`.
                  The raw token is never stored by the browser.
                </Text>
                <PasswordInput
                  label="Setup token"
                  value={setupToken}
                  onChange={(event) => setSetupToken(event.currentTarget.value)}
                />
              </Stack>
            </Card>
          </SimpleGrid>

          <Card radius="xl" p="xl" withBorder>
            <Stack gap="md">
              <Title order={3}>First super admin</Title>
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <TextInput
                  label="Display name"
                  value={superAdminDisplayName}
                  onChange={(event) =>
                    setSuperAdminDisplayName(event.currentTarget.value)
                  }
                />
                <TextInput
                  label="Email"
                  value={superAdminEmail}
                  onChange={(event) =>
                    setSuperAdminEmail(event.currentTarget.value)
                  }
                />
                <PasswordInput
                  label="Password"
                  value={superAdminPassword}
                  onChange={(event) =>
                    setSuperAdminPassword(event.currentTarget.value)
                  }
                />
              </SimpleGrid>
            </Stack>
          </Card>

          <Card radius="xl" p="xl" withBorder>
            <Stack gap="md">
              <Title order={3}>First tenant</Title>
              <SimpleGrid cols={{ base: 1, md: 3 }}>
                <TextInput
                  label="Display name"
                  value={tenantDisplayName}
                  onChange={(event) =>
                    setTenantDisplayName(event.currentTarget.value)
                  }
                />
                <TextInput
                  label="Slug"
                  value={tenantSlug}
                  onChange={(event) => {
                    setTenantSlugTouched(true);
                    setTenantSlug(event.currentTarget.value);
                  }}
                />
                <Checkbox
                  mt="xl"
                  label="Allow user credential override"
                  checked={allowUserCredentialOverride}
                  onChange={(event) =>
                    setAllowUserCredentialOverride(event.currentTarget.checked)
                  }
                />
              </SimpleGrid>
            </Stack>
          </Card>

          <Card radius="xl" p="xl" withBorder>
            <Stack gap="lg">
              <Group justify="space-between">
                <div>
                  <Title order={3}>Provider credentials</Title>
                  <Text size="sm" c="dimmed">
                    Optional tenant-scoped BYOK credentials. You can test them
                    live before committing the bootstrap.
                  </Text>
                </div>
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() =>
                    setProviderDrafts((current) => [...current, createProviderDraft()])
                  }
                >
                  Add provider
                </Button>
              </Group>

              {providerDrafts.map((draft, index) => {
                const testState = providerTests[draft.localId];
                return (
                  <Card key={draft.localId} withBorder radius="lg" p="md">
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Text fw={600}>Provider #{index + 1}</Text>
                        {providerDrafts.length > 1 ? (
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() =>
                              setProviderDrafts((current) =>
                                current.filter((entry) => entry.localId !== draft.localId),
                              )
                            }
                            aria-label={`Remove provider ${index + 1}`}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        ) : null}
                      </Group>
                      <SimpleGrid cols={{ base: 1, md: 2 }}>
                        <Select
                          label="Provider"
                          data={providerOptions}
                          value={draft.providerId}
                          onChange={(value) =>
                            setProviderDrafts((current) =>
                              current.map((entry) =>
                                entry.localId === draft.localId
                                  ? { ...entry, providerId: value ?? '' }
                                  : entry,
                              ),
                            )
                          }
                          searchable
                        />
                        <TextInput
                          label="Credential label"
                          value={draft.label}
                          onChange={(event) =>
                            setProviderDrafts((current) =>
                              current.map((entry) =>
                                entry.localId === draft.localId
                                  ? { ...entry, label: event.currentTarget.value }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <PasswordInput
                          label="API token"
                          value={draft.apiToken}
                          onChange={(event) =>
                            setProviderDrafts((current) =>
                              current.map((entry) =>
                                entry.localId === draft.localId
                                  ? { ...entry, apiToken: event.currentTarget.value }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <TextInput
                          label="Base URL"
                          value={draft.baseUrl}
                          onChange={(event) =>
                            setProviderDrafts((current) =>
                              current.map((entry) =>
                                entry.localId === draft.localId
                                  ? { ...entry, baseUrl: event.currentTarget.value }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <TextInput
                          label="Default text model"
                          value={draft.defaultTextModel}
                          onChange={(event) =>
                            setProviderDrafts((current) =>
                              current.map((entry) =>
                                entry.localId === draft.localId
                                  ? {
                                      ...entry,
                                      defaultTextModel: event.currentTarget.value,
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                        <TextInput
                          label="Default image model"
                          value={draft.defaultImageModel}
                          onChange={(event) =>
                            setProviderDrafts((current) =>
                              current.map((entry) =>
                                entry.localId === draft.localId
                                  ? {
                                      ...entry,
                                      defaultImageModel: event.currentTarget.value,
                                    }
                                  : entry,
                              ),
                            )
                          }
                        />
                      </SimpleGrid>
                      <Group justify="space-between" align="center">
                        <Button
                          variant="light"
                          leftSection={<IconRefresh size={16} />}
                          disabled={!setupToken.trim()}
                          loading={
                            providerTestMutation.isPending &&
                            providerTestMutation.variables?.localId === draft.localId
                          }
                          onClick={() =>
                            providerTestMutation.mutate({
                              localId: draft.localId,
                              payload: draft,
                            })
                          }
                        >
                          Test live credential
                        </Button>
                        {testState?.result ? (
                          <Badge
                            color={testState.status === 'success' ? 'teal' : 'red'}
                            variant="light"
                          >
                            {testState.status === 'success'
                              ? `OK${
                                  testState.result.modelTested
                                    ? ` · ${testState.result.modelTested}`
                                    : ''
                                }`
                              : testState.result.errorMessage ?? 'Test failed'}
                          </Badge>
                        ) : null}
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          </Card>

          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Card radius="xl" p="xl" withBorder>
              <Stack gap="md">
                <Title order={3}>Tenant policy defaults</Title>
                <TextInput
                  label="Monthly budget (USD)"
                  value={monthlyBudgetUsd}
                  onChange={(event) => setMonthlyBudgetUsd(event.currentTarget.value)}
                  placeholder="Optional"
                />
                <NumberInput
                  label="Requests per minute"
                  value={requestsPerMinute}
                  onChange={(value) => setRequestsPerMinute(asNumberOrEmpty(value))}
                  min={1}
                />
                <NumberInput
                  label="Tokens per minute"
                  value={tokensPerMinute}
                  onChange={(value) => setTokensPerMinute(asNumberOrEmpty(value))}
                  min={1}
                />
                <NumberInput
                  label="Retention days"
                  value={retentionDays}
                  onChange={(value) => setRetentionDays(asNumberOrEmpty(value))}
                  min={1}
                />
                <Switch
                  label="Allow prompt logging"
                  checked={allowPromptLogging}
                  onChange={(event) =>
                    setAllowPromptLogging(event.currentTarget.checked)
                  }
                />
                <Switch
                  label="Allow response logging"
                  checked={allowResponseLogging}
                  onChange={(event) =>
                    setAllowResponseLogging(event.currentTarget.checked)
                  }
                />
              </Stack>
            </Card>

            <Card radius="xl" p="xl" withBorder>
              <Stack gap="md">
                <Group justify="space-between">
                  <Title order={3}>Open WebUI</Title>
                  <Switch
                    checked={openWebUiEnabled}
                    onChange={(event) =>
                      setOpenWebUiEnabled(event.currentTarget.checked)
                    }
                    label={openWebUiEnabled ? 'Enabled' : 'Disabled'}
                  />
                </Group>
                {openWebUiEnabled ? (
                  <>
                    <TextInput
                      label="Client ID"
                      value={openWebUiClientId}
                      onChange={(event) =>
                        setOpenWebUiClientId(event.currentTarget.value)
                      }
                    />
                    <TextInput
                      label="Display name"
                      value={openWebUiDisplayName}
                      onChange={(event) =>
                        setOpenWebUiDisplayName(event.currentTarget.value)
                      }
                    />
                    <TextInput
                      label="Application ID"
                      value={openWebUiApplicationId}
                      onChange={(event) =>
                        setOpenWebUiApplicationId(event.currentTarget.value)
                      }
                    />
                    <Switch
                      label="Create API key during setup"
                      checked={openWebUiCreateApiKey}
                      onChange={(event) =>
                        setOpenWebUiCreateApiKey(event.currentTarget.checked)
                      }
                    />
                    {openWebUiCreateApiKey ? (
                      <TextInput
                        label="API key label"
                        value={openWebUiApiKeyLabel}
                        onChange={(event) =>
                          setOpenWebUiApiKeyLabel(event.currentTarget.value)
                        }
                      />
                    ) : null}
                    <Switch
                      label="Trust forwarded user identity headers"
                      checked={openWebUiTrustedIdentity}
                      onChange={(event) =>
                        setOpenWebUiTrustedIdentity(event.currentTarget.checked)
                      }
                    />
                    <Divider />
                    <Text size="sm" fw={600}>
                      Scopes
                    </Text>
                    <Checkbox
                      label="chat:completion"
                      checked={openWebUiScopes.chat}
                      onChange={(event) =>
                        setOpenWebUiScopes((current) => ({
                          ...current,
                          chat: event.currentTarget.checked,
                        }))
                      }
                    />
                    <Checkbox
                      label="models:list"
                      checked={openWebUiScopes.models}
                      onChange={(event) =>
                        setOpenWebUiScopes((current) => ({
                          ...current,
                          models: event.currentTarget.checked,
                        }))
                      }
                    />
                    <Checkbox
                      label="image:generate"
                      checked={openWebUiScopes.imageGenerate}
                      onChange={(event) =>
                        setOpenWebUiScopes((current) => ({
                          ...current,
                          imageGenerate: event.currentTarget.checked,
                        }))
                      }
                    />
                    <Checkbox
                      label="image:edit"
                      checked={openWebUiScopes.imageEdit}
                      onChange={(event) =>
                        setOpenWebUiScopes((current) => ({
                          ...current,
                          imageEdit: event.currentTarget.checked,
                        }))
                      }
                    />
                    <Checkbox
                      label="video:generate"
                      checked={openWebUiScopes.videoGenerate}
                      onChange={(event) =>
                        setOpenWebUiScopes((current) => ({
                          ...current,
                          videoGenerate: event.currentTarget.checked,
                        }))
                      }
                    />
                  </>
                ) : (
                  <Text size="sm" c="dimmed">
                    Skip this if you only want the core admin and gateway setup
                    for now.
                  </Text>
                )}
              </Stack>
            </Card>
          </SimpleGrid>

          <Card radius="xl" p="xl" withBorder>
            <Stack gap="md">
              <Title order={3}>Review and bootstrap</Title>
              <Text c="dimmed" size="sm">
                This request is atomic. If one step fails, the backend rolls
                everything back and setup remains open.
              </Text>

              {bootstrapMutation.isError ? (
                <Alert color="red" icon={<IconAlertTriangle size={18} />}>
                  {bootstrapMutation.error instanceof Error
                    ? bootstrapMutation.error.message
                    : 'The installation bootstrap failed.'}
                </Alert>
              ) : null}

              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Super admin, tenant, policies, optional credentials, and
                  optional Open WebUI integration will be created in one
                  transaction.
                </Text>
                <Button
                  size="md"
                  disabled={!hasBasicBootstrapFields}
                  loading={bootstrapMutation.isPending}
                  onClick={() => bootstrapMutation.mutate()}
                >
                  Complete installation
                </Button>
              </Group>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}

function StatusRow(input: {
  label: string;
  value: string;
  tone: 'good' | 'warn';
}) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {input.label}
      </Text>
      <Badge color={input.tone === 'good' ? 'teal' : 'yellow'} variant="light">
        {input.value}
      </Badge>
    </Group>
  );
}

function asNumberOrEmpty(value: string | number): number | '' {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}

function collectOpenWebUiScopes(input: {
  chat: boolean;
  models: boolean;
  imageGenerate: boolean;
  imageEdit: boolean;
  videoGenerate: boolean;
}): string[] {
  const scopes: string[] = [];

  if (input.chat) {
    scopes.push('chat:completion');
  }
  if (input.models) {
    scopes.push('models:list');
  }
  if (input.imageGenerate) {
    scopes.push('image:generate');
  }
  if (input.imageEdit) {
    scopes.push('image:edit');
  }
  if (input.videoGenerate) {
    scopes.push('video:generate');
  }

  return scopes;
}

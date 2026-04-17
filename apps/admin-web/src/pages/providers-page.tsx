import { Alert, Button, Card, Grid, Group, PasswordInput, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconAlertCircle, IconEdit, IconKey, IconRestore, IconSettings } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '../components/page-header';
import { adminApiClient, gatewayApiClient } from '../lib/api-client';
import { useRuntimeConfig } from '../lib/use-runtime-config';

export function ProvidersPage() {
  const queryClient = useQueryClient();
  const runtimeConfigQuery = useRuntimeConfig();
  const [providerId, setProviderId] = useState<'nanogpt'>('nanogpt');
  const [label, setLabel] = useState('primary');
  const [apiToken, setApiToken] = useState('');
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);

  const credentialsQuery = useQuery({
    queryKey: ['own-provider-credentials'],
    queryFn: () => adminApiClient.getOwnProviderCredentials(),
  });
  const providerSettingsQuery = useQuery({
    queryKey: ['own-provider-settings'],
    queryFn: () => adminApiClient.getOwnProviderSettings(),
  });

  const supportedProviders = runtimeConfigQuery.data?.supportedProviders ?? [];
  const providerOptions = supportedProviders.map((provider) => ({
    value: provider.providerId,
    label: provider.displayName,
  }));

  useEffect(() => {
    if (providerOptions.length > 0 && !providerId) {
      setProviderId(providerOptions[0]!.value as 'nanogpt');
    }
  }, [providerId, providerOptions]);

  useEffect(() => {
    if (!providerSettingsQuery.data) {
      return;
    }

    setDefaultProviderId(providerSettingsQuery.data.defaultProviderId);
    setDefaultModel(providerSettingsQuery.data.defaultModel);
  }, [providerSettingsQuery.data]);

  const defaultProviderOptions = useMemo(() => {
    const activeProviderIds = new Set(
      (credentialsQuery.data ?? [])
        .filter((credential) => credential.isActive)
        .map((credential) => credential.providerId),
    );

    return supportedProviders
      .filter((provider) => activeProviderIds.has(provider.providerId))
      .map((provider) => ({
        value: provider.providerId,
        label: provider.displayName,
      }));
  }, [credentialsQuery.data, supportedProviders]);

  const modelsQuery = useQuery({
    queryKey: ['provider-models', defaultProviderId],
    queryFn: () => gatewayApiClient.getModels(defaultProviderId ?? undefined),
    enabled: Boolean(defaultProviderId),
  });

  useEffect(() => {
    if (!defaultProviderId) {
      setDefaultModel(null);
      return;
    }

    if (!modelsQuery.data?.models.length) {
      return;
    }

    const modelStillExists = modelsQuery.data.models.some((entry) => entry.id === defaultModel);
    if (!modelStillExists && !modelsQuery.isPending) {
      setDefaultModel(null);
    }
  }, [defaultModel, defaultProviderId, modelsQuery.data, modelsQuery.isPending]);

  const upsertCredentialMutation = useMutation({
    mutationFn: () => {
      if (editingCredentialId) {
        return adminApiClient.updateOwnProviderCredential(editingCredentialId, {
          label,
          apiToken: apiToken.trim() || undefined,
        });
      }

      return adminApiClient.createOwnProviderCredential({
        providerId,
        label,
        apiToken,
      });
    },
    onSuccess: async () => {
      resetCredentialForm();
      await queryClient.invalidateQueries({ queryKey: ['own-provider-credentials'] });
    },
  });

  const saveDefaultsMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateOwnProviderSettings({
        defaultProviderId: (defaultProviderId as 'nanogpt' | null) ?? null,
        defaultModel: defaultProviderId ? defaultModel ?? null : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['own-provider-settings'] });
    },
  });

  const providerSettingsDirty =
    defaultProviderId !== (providerSettingsQuery.data?.defaultProviderId ?? null) ||
    defaultModel !== (providerSettingsQuery.data?.defaultModel ?? null);

  function resetCredentialForm() {
    setEditingCredentialId(null);
    setProviderId((providerOptions[0]?.value as 'nanogpt') ?? 'nanogpt');
    setLabel('primary');
    setApiToken('');
  }

  function beginCredentialEdit(
    credential: {
      id: string;
      providerId: string;
      label: string;
    },
  ) {
    setEditingCredentialId(credential.id);
    setProviderId(credential.providerId as 'nanogpt');
    setLabel(credential.label);
    setApiToken('');
  }

  function resolveProviderDisplayName(providerIdToResolve: string): string {
    return (
      supportedProviders.find((provider) => provider.providerId === providerIdToResolve)?.displayName ??
      providerIdToResolve
    );
  }

  const defaultModelOptions = (modelsQuery.data?.models ?? []).map((modelEntry) => ({
    value: modelEntry.id,
    label: modelEntry.displayName,
  }));

  return (
    <>
      <PageHeader
        title="Provider Tokens"
        description="Manage your write-only provider credentials and choose the default provider/model used when gateway chat requests omit those values."
      />
      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            <Card className="section-card">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={3}>{editingCredentialId ? 'Edit provider credential' : 'Add provider credential'}</Title>
                  <IconKey size={18} />
                </Group>
                <Text c="dimmed" size="sm">
                  Token values remain write-only. After save, only a masked hint is shown back to you.
                </Text>
                <Select
                  label="Provider"
                  data={providerOptions}
                  onChange={(value) => setProviderId((value as 'nanogpt') ?? 'nanogpt')}
                  value={providerId}
                  disabled={Boolean(editingCredentialId)}
                />
                <TextInput
                  label="Label"
                  onChange={(event) => setLabel(event.currentTarget.value)}
                  value={label}
                />
                <PasswordInput
                  label={editingCredentialId ? 'Replace API token' : 'API token'}
                  description={
                    editingCredentialId
                      ? 'Leave blank to keep the current token and update only the label.'
                      : undefined
                  }
                  onChange={(event) => setApiToken(event.currentTarget.value)}
                  placeholder={editingCredentialId ? 'Enter a new token only if you want to rotate it' : undefined}
                  value={apiToken}
                />
                <Group justify="space-between">
                  <Group gap="xs">
                    {editingCredentialId ? (
                      <Button
                        onClick={resetCredentialForm}
                        leftSection={<IconRestore size={16} />}
                        variant="light"
                      >
                        Cancel edit
                      </Button>
                    ) : null}
                  </Group>
                  <Button
                    onClick={() => upsertCredentialMutation.mutate()}
                    loading={upsertCredentialMutation.isPending}
                    disabled={!label.trim() || (!editingCredentialId && !apiToken.trim())}
                  >
                    {editingCredentialId ? 'Update credential' : 'Save credential'}
                  </Button>
                </Group>
              </Stack>
            </Card>

            <Card className="section-card">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={3}>Gateway defaults</Title>
                  <IconSettings size={18} />
                </Group>
                <Text c="dimmed" size="sm">
                  These values are used when `/api/v1/chat` is called without an explicit `providerId` and `model`.
                </Text>
                <Select
                  clearable
                  label="Default provider"
                  placeholder={
                    defaultProviderOptions.length
                      ? 'Choose a provider with an active credential'
                      : 'Add a credential first'
                  }
                  data={defaultProviderOptions}
                  onChange={(value) => {
                    setDefaultProviderId(value ?? null);
                    setDefaultModel(null);
                  }}
                  value={defaultProviderId}
                />
                <Select
                  clearable
                  label="Default model"
                  placeholder={
                    defaultProviderId
                      ? modelsQuery.isPending
                        ? 'Loading provider models...'
                        : 'Choose a default model'
                      : 'Choose a default provider first'
                  }
                  data={defaultModelOptions}
                  onChange={(value) => setDefaultModel(value ?? null)}
                  value={defaultModel}
                  disabled={!defaultProviderId || modelsQuery.isPending || modelsQuery.isError}
                />
                {modelsQuery.isError ? (
                  <Alert color="red" icon={<IconAlertCircle size={18} />} title="Model loading failed">
                    {modelsQuery.error instanceof Error
                      ? modelsQuery.error.message
                      : 'Unable to load models for the selected provider.'}
                  </Alert>
                ) : null}
                <Button
                  onClick={() => saveDefaultsMutation.mutate()}
                  loading={saveDefaultsMutation.isPending}
                  disabled={!providerSettingsDirty}
                >
                  Save defaults
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card className="section-card">
            <Stack gap="sm">
              <Title order={3}>My credentials</Title>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Provider</Table.Th>
                    <Table.Th>Label</Table.Th>
                    <Table.Th>Masked value</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(credentialsQuery.data ?? []).map((credential) => (
                    <Table.Tr key={credential.id}>
                      <Table.Td>
                        <Stack gap={2}>
                          <Text>{credential.providerDisplayName}</Text>
                          {providerSettingsQuery.data?.defaultProviderId === credential.providerId ? (
                            <Text c="dimmed" size="xs">
                              Default provider
                            </Text>
                          ) : null}
                        </Stack>
                      </Table.Td>
                      <Table.Td>{credential.label}</Table.Td>
                      <Table.Td>{credential.maskedHint ?? 'Hidden'}</Table.Td>
                      <Table.Td>{credential.isActive ? 'Active' : 'Disabled'}</Table.Td>
                      <Table.Td>
                        <Button
                          leftSection={<IconEdit size={14} />}
                          onClick={() => beginCredentialEdit(credential)}
                          size="xs"
                          variant="light"
                        >
                          Edit
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              {!credentialsQuery.data?.length ? (
                <Text c="dimmed" size="sm">
                  No credentials saved yet. Add one before setting gateway defaults.
                </Text>
              ) : null}

              {providerSettingsQuery.data?.defaultProviderId ? (
                <Alert color="teal" title="Current gateway defaults">
                  Provider: {resolveProviderDisplayName(providerSettingsQuery.data.defaultProviderId)}
                  <br />
                  Model: {providerSettingsQuery.data.defaultModel ?? 'None configured'}
                </Alert>
              ) : null}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
      <Alert color="blue" mt="lg" title="Boundary reminder">
        Administrators may create or reset another user provider credential, but they should only ever see the
        masked version of another user secret, never the raw token.
      </Alert>
    </>
  );
}

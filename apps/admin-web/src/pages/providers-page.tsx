import { Alert, Grid, Stack } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { ProviderCredentialForm } from '../features/providers/components/provider-credential-form';
import { ProviderCredentialsPanel } from '../features/providers/components/provider-credentials-panel';
import { ProviderDefaultsForm } from '../features/providers/components/provider-defaults-form';
import {
  buildDefaultModelOptions,
  buildDefaultProviderOptions,
  buildProviderOptions,
  resolveProviderDisplayName,
} from '../features/providers/lib/provider-utils';
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
  const providerOptions = useMemo(
    () => buildProviderOptions(supportedProviders),
    [supportedProviders],
  );

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
    return buildDefaultProviderOptions(credentialsQuery.data ?? [], supportedProviders);
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

  const defaultModelOptions = buildDefaultModelOptions(modelsQuery.data?.models ?? []);

  function handleCredentialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!label.trim() || (!editingCredentialId && !apiToken.trim())) {
      return;
    }

    upsertCredentialMutation.mutate();
  }

  function handleDefaultsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!providerSettingsDirty) {
      return;
    }

    saveDefaultsMutation.mutate();
  }

  return (
    <>
      <PageHeader
        title="Provider Tokens"
        description="Manage your write-only provider credentials and choose the default provider/model used when gateway chat requests omit those values."
      />
      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            <ProviderCredentialForm
              apiToken={apiToken}
              editingCredentialId={editingCredentialId}
              isPending={upsertCredentialMutation.isPending}
              label={label}
              onApiTokenChange={setApiToken}
              onCancelEdit={resetCredentialForm}
              onLabelChange={setLabel}
              onProviderChange={(value) => setProviderId((value as 'nanogpt') ?? 'nanogpt')}
              onSubmit={handleCredentialSubmit}
              providerId={providerId}
              providerOptions={providerOptions}
            />

            <ProviderDefaultsForm
              defaultModel={defaultModel}
              defaultModelOptions={defaultModelOptions}
              defaultProviderId={defaultProviderId}
              defaultProviderOptions={defaultProviderOptions}
              isDirty={providerSettingsDirty}
              isModelLoading={modelsQuery.isPending}
              isPending={saveDefaultsMutation.isPending}
              modelErrorMessage={
                modelsQuery.isError
                  ? modelsQuery.error instanceof Error
                    ? modelsQuery.error.message
                    : 'Unable to load models for the selected provider.'
                  : null
              }
              onDefaultModelChange={(value) => setDefaultModel(value ?? null)}
              onDefaultProviderChange={(value) => {
                setDefaultProviderId(value ?? null);
                setDefaultModel(null);
              }}
              onSubmit={handleDefaultsSubmit}
            />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <ProviderCredentialsPanel
            credentials={credentialsQuery.data ?? []}
            currentDefaultModel={providerSettingsQuery.data?.defaultModel ?? null}
            currentDefaultProviderDisplayName={
              providerSettingsQuery.data?.defaultProviderId
                ? resolveProviderDisplayName(
                    supportedProviders,
                    providerSettingsQuery.data.defaultProviderId,
                  )
                : null
            }
            currentDefaultProviderId={providerSettingsQuery.data?.defaultProviderId ?? null}
            onEditCredential={beginCredentialEdit}
          />
        </Grid.Col>
      </Grid>
      <Alert color="blue" mt="lg" title="Boundary reminder">
        Administrators may create or reset another user provider credential, but they should only ever see the
        masked version of another user secret, never the raw token.
      </Alert>
    </>
  );
}

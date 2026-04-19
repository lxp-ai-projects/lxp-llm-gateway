import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { adminApiClient, gatewayApiClient } from '../../../lib/api-client';
import { useRuntimeConfig } from '../../../lib/use-runtime-config';
import {
  buildDefaultModelOptions,
  buildDefaultProviderOptions,
  buildProviderOptions,
  resolveProviderDisplayName,
  validateProviderCredentialInput,
} from '../lib/provider-utils';

function resolvePreferredProviderId(providerOptions: Array<{ value: string }>) {
  return (
    providerOptions.find((option) => option.value === 'nanogpt')?.value ??
    providerOptions[0]?.value ??
    'nanogpt'
  );
}

export function useProvidersController() {
  const queryClient = useQueryClient();
  const runtimeConfigQuery = useRuntimeConfig();
  const [providerId, setProviderId] = useState('nanogpt');
  const [label, setLabel] = useState('primary');
  const [apiToken, setApiToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [credentialValidationError, setCredentialValidationError] = useState<
    string | null
  >(null);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null,
  );
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(
    null,
  );
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
      setProviderId(providerOptions[0]!.value);
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
    return buildDefaultProviderOptions(
      credentialsQuery.data ?? [],
      supportedProviders,
    );
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

    const modelStillExists = modelsQuery.data.models.some(
      (entry) => entry.id === defaultModel,
    );
    if (!modelStillExists && !modelsQuery.isPending) {
      setDefaultModel(null);
    }
  }, [
    defaultModel,
    defaultProviderId,
    modelsQuery.data,
    modelsQuery.isPending,
  ]);

  const upsertCredentialMutation = useMutation({
    mutationFn: () => {
      if (editingCredentialId) {
        return adminApiClient.updateOwnProviderCredential(editingCredentialId, {
          label,
          apiToken: apiToken.trim() || undefined,
          baseUrl: baseUrl.trim() || undefined,
        });
      }

      return adminApiClient.createOwnProviderCredential({
        providerId,
        label,
        apiToken: apiToken.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined,
      });
    },
    onSuccess: async () => {
      resetCredentialForm();
      await queryClient.invalidateQueries({
        queryKey: ['own-provider-credentials'],
      });
    },
  });

  const saveDefaultsMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateOwnProviderSettings({
        defaultProviderId: defaultProviderId ?? null,
        defaultModel: defaultProviderId ? (defaultModel ?? null) : null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['own-provider-settings'],
      });
    },
  });

  const providerSettingsDirty =
    defaultProviderId !==
      (providerSettingsQuery.data?.defaultProviderId ?? null) ||
    defaultModel !== (providerSettingsQuery.data?.defaultModel ?? null);

  function resetCredentialForm() {
    setEditingCredentialId(null);
    setProviderId(resolvePreferredProviderId(providerOptions));
    setLabel('primary');
    setApiToken('');
    setBaseUrl('');
    setCredentialValidationError(null);
  }

  function beginCredentialEdit(credential: {
    id: string;
    providerId: string;
    label: string;
  }) {
    setEditingCredentialId(credential.id);
    setProviderId(credential.providerId);
    setLabel(credential.label);
    setApiToken('');
    setBaseUrl('');
    setCredentialValidationError(null);
  }

  const defaultModelOptions = buildDefaultModelOptions(
    modelsQuery.data?.models ?? [],
  );

  function handleCredentialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!label.trim() || (!editingCredentialId && !apiToken.trim() && !baseUrl.trim())) {
      return;
    }

    const validationError = validateProviderCredentialInput({
      providerId,
      apiToken,
      baseUrl,
    });
    setCredentialValidationError(validationError);
    if (validationError) {
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

  return {
    apiToken,
    baseUrl,
    credentialValidationError,
    credentials: credentialsQuery.data ?? [],
    currentDefaultModel: providerSettingsQuery.data?.defaultModel ?? null,
    currentDefaultProviderDisplayName: providerSettingsQuery.data
      ?.defaultProviderId
      ? resolveProviderDisplayName(
          supportedProviders,
          providerSettingsQuery.data.defaultProviderId,
        )
      : null,
    currentDefaultProviderId:
      providerSettingsQuery.data?.defaultProviderId ?? null,
    defaultModel,
    defaultModelOptions,
    defaultProviderId,
    defaultProviderOptions,
    editingCredentialId,
    handleCredentialSubmit,
    handleDefaultsSubmit,
    isCredentialPending: upsertCredentialMutation.isPending,
    isDefaultsPending: saveDefaultsMutation.isPending,
    isModelLoading: modelsQuery.isPending,
    label,
    modelErrorMessage: modelsQuery.isError
      ? modelsQuery.error instanceof Error
        ? modelsQuery.error.message
        : 'Unable to load models for the selected provider.'
      : null,
    onApiTokenChange: (value: string) => {
      setApiToken(value);
      if (credentialValidationError) {
        setCredentialValidationError(null);
      }
    },
    onBaseUrlChange: (value: string) => {
      setBaseUrl(value);
      if (credentialValidationError) {
        setCredentialValidationError(null);
      }
    },
    onDefaultModelChange: (value: string | null) => setDefaultModel(value),
    onDefaultProviderChange: (value: string | null) => {
      setDefaultProviderId(value);
      setDefaultModel(null);
    },
    onLabelChange: setLabel,
    onProviderChange: (value: string | null) => {
      setProviderId(value ?? 'nanogpt');
      if (credentialValidationError) {
        setCredentialValidationError(null);
      }
    },
    providerId,
    providerOptions,
    providerSettingsDirty,
    resetCredentialForm,
    beginCredentialEdit,
  };
}

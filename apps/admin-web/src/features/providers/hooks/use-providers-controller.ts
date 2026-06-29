import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { adminApiClient } from '../../../lib/api-client';
import { useRuntimeConfig } from '../../../lib/use-runtime-config';
import {
  buildDefaultModelOptions,
  buildDefaultImageProviderOptions,
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
  const [credentialSubmitError, setCredentialSubmitError] = useState<string | null>(
    null,
  );
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null,
  );
  const [credentialPendingDelete, setCredentialPendingDelete] = useState<
    string | null
  >(null);
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(
    null,
  );
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [defaultImageProviderId, setDefaultImageProviderId] = useState<string | null>(
    null,
  );
  const [defaultImageModel, setDefaultImageModel] = useState<string | null>(null);

  const credentialsQuery = useQuery({
    queryKey: ['own-provider-credentials'],
    queryFn: () => adminApiClient.getOwnProviderCredentials(),
  });
  const providerSettingsQuery = useQuery({
    queryKey: ['own-provider-settings'],
    queryFn: () => adminApiClient.getOwnProviderSettings(),
  });
  const imageCatalogQuery = useQuery({
    queryKey: ['image-catalog-for-provider-settings'],
    queryFn: () => adminApiClient.getOwnImageCatalog(),
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
    setDefaultImageProviderId(providerSettingsQuery.data.defaultImageProviderId);
    setDefaultImageModel(providerSettingsQuery.data.defaultImageModel);
  }, [providerSettingsQuery.data]);

  const defaultProviderOptions = useMemo(() => {
    return buildDefaultProviderOptions(
      credentialsQuery.data ?? [],
      supportedProviders,
    );
  }, [credentialsQuery.data, supportedProviders]);
  const defaultImageProviderOptions = useMemo(() => {
    return buildDefaultImageProviderOptions(
      credentialsQuery.data ?? [],
      supportedProviders,
      imageCatalogQuery.data?.providers ?? [],
    );
  }, [credentialsQuery.data, imageCatalogQuery.data?.providers, supportedProviders]);

  const modelsQuery = useQuery({
    queryKey: ['provider-models', defaultProviderId],
    queryFn: () => adminApiClient.getOwnModels(defaultProviderId ?? undefined),
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

  useEffect(() => {
    if (!defaultImageProviderId) {
      setDefaultImageModel(null);
      return;
    }

    const imageProvider = imageCatalogQuery.data?.providers.find(
      (provider) => provider.providerId === defaultImageProviderId,
    );
    if (!imageProvider?.models.length) {
      return;
    }

    const modelStillExists = imageProvider.models.some(
      (entry) => entry.id === defaultImageModel,
    );
    if (!modelStillExists && !imageCatalogQuery.isPending) {
      setDefaultImageModel(null);
    }
  }, [
    defaultImageModel,
    defaultImageProviderId,
    imageCatalogQuery.data,
    imageCatalogQuery.isPending,
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
      setCredentialSubmitError(null);
      await queryClient.invalidateQueries({
        queryKey: ['own-provider-credentials'],
      });
    },
    onError: (error) => {
      setCredentialSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to save the provider credential.',
      );
    },
  });

  const deleteCredentialMutation = useMutation({
    mutationFn: (credentialId: string) =>
      adminApiClient.deleteOwnProviderCredential(credentialId),
    onSuccess: async () => {
      setCredentialPendingDelete(null);
      if (
        editingCredentialId &&
        editingCredentialId === deleteCredentialMutation.variables
      ) {
        resetCredentialForm();
      }
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
        defaultImageProviderId: defaultImageProviderId ?? null,
        defaultImageModel: defaultImageProviderId ? (defaultImageModel ?? null) : null,
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
    defaultModel !== (providerSettingsQuery.data?.defaultModel ?? null) ||
    defaultImageProviderId !==
      (providerSettingsQuery.data?.defaultImageProviderId ?? null) ||
    defaultImageModel !== (providerSettingsQuery.data?.defaultImageModel ?? null);

  function resetCredentialForm() {
    setEditingCredentialId(null);
    setProviderId(resolvePreferredProviderId(providerOptions));
    setLabel('primary');
    setApiToken('');
    setBaseUrl('');
    setCredentialValidationError(null);
    setCredentialSubmitError(null);
    setCredentialPendingDelete(null);
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
    setCredentialSubmitError(null);
    setCredentialPendingDelete(null);
  }

  const defaultModelOptions = buildDefaultModelOptions(
    modelsQuery.data?.models ?? [],
  );
  const defaultImageModelOptions = buildDefaultModelOptions(
    imageCatalogQuery.data?.providers.find(
      (provider) => provider.providerId === defaultImageProviderId,
    )?.models ?? [],
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
    setCredentialSubmitError(null);
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
    credentialPendingDelete,
    credentialSubmitError,
    credentialValidationError,
    credentials: credentialsQuery.data ?? [],
    confirmDeleteCredential: (credentialId: string) => {
      setCredentialPendingDelete(credentialId);
    },
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
    currentDefaultImageModel: providerSettingsQuery.data?.defaultImageModel ?? null,
    currentDefaultImageProviderDisplayName: providerSettingsQuery.data
      ?.defaultImageProviderId
      ? resolveProviderDisplayName(
          supportedProviders,
          providerSettingsQuery.data.defaultImageProviderId,
        )
      : null,
    currentDefaultImageProviderId:
      providerSettingsQuery.data?.defaultImageProviderId ?? null,
    defaultModel,
    defaultModelOptions,
    defaultProviderId,
    defaultProviderOptions,
    defaultImageModel,
    defaultImageModelOptions,
    defaultImageProviderId,
    defaultImageProviderOptions,
    deleteCredential: (credentialId: string) => {
      deleteCredentialMutation.mutate(credentialId);
    },
    editingCredentialId,
    handleCredentialSubmit,
    handleDefaultsSubmit,
    isDeleteCredentialPending: deleteCredentialMutation.isPending,
    isCredentialPending: upsertCredentialMutation.isPending,
    isDefaultsPending: saveDefaultsMutation.isPending,
    isModelLoading: modelsQuery.isPending,
    isImageModelLoading: imageCatalogQuery.isPending,
    label,
    modelErrorMessage: modelsQuery.isError
      ? modelsQuery.error instanceof Error
        ? modelsQuery.error.message
        : 'Unable to load models for the selected provider.'
      : null,
    imageModelErrorMessage: imageCatalogQuery.isError
      ? imageCatalogQuery.error instanceof Error
        ? imageCatalogQuery.error.message
        : 'Unable to load models for the selected image provider.'
      : null,
    onApiTokenChange: (value: string) => {
      setApiToken(value);
      if (credentialValidationError) {
        setCredentialValidationError(null);
      }
      if (credentialSubmitError) {
        setCredentialSubmitError(null);
      }
    },
    onBaseUrlChange: (value: string) => {
      setBaseUrl(value);
      if (credentialValidationError) {
        setCredentialValidationError(null);
      }
      if (credentialSubmitError) {
        setCredentialSubmitError(null);
      }
    },
    onCancelDeleteCredential: () => setCredentialPendingDelete(null),
    onDefaultModelChange: (value: string | null) => setDefaultModel(value),
    onDefaultProviderChange: (value: string | null) => {
      setDefaultProviderId(value);
      setDefaultModel(null);
    },
    onDefaultImageModelChange: (value: string | null) => setDefaultImageModel(value),
    onDefaultImageProviderChange: (value: string | null) => {
      setDefaultImageProviderId(value);
      setDefaultImageModel(null);
    },
    onLabelChange: setLabel,
    onProviderChange: (value: string | null) => {
      setProviderId(value ?? 'nanogpt');
      if (credentialValidationError) {
        setCredentialValidationError(null);
      }
      if (credentialSubmitError) {
        setCredentialSubmitError(null);
      }
    },
    providerId,
    providerOptions,
    providerSettingsDirty,
    resetCredentialForm,
    beginCredentialEdit,
  };
}

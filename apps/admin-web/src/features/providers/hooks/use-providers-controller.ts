import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { adminApiClient } from '../../../lib/api-client';
import type { ParsedApiError } from '../../../lib/api-base';
import type { ProviderCredentialSummary } from '../../../lib/api-client.types';
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
  const [credentialConflictPrompt, setCredentialConflictPrompt] = useState<{
    providerId: string;
    label: string;
    scope: ProviderCredentialSummary['scope'];
    message: string;
  } | null>(null);
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(
    null,
  );
  const [credentialEditMode, setCredentialEditMode] = useState<
    'edit' | 'replace'
  >('edit');
  const [credentialDeleteTarget, setCredentialDeleteTarget] =
    useState<ProviderCredentialSummary | null>(null);
  const [deleteCredentialError, setDeleteCredentialError] = useState<string | null>(
    null,
  );
  const [deleteCredentialSuccessMessage, setDeleteCredentialSuccessMessage] =
    useState<string | null>(null);
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
      setCredentialConflictPrompt(null);
      await queryClient.invalidateQueries({
        queryKey: ['own-provider-credentials'],
      });
    },
    onError: (error) => {
      const apiError = error as Partial<ParsedApiError> | undefined;
      if (apiError?.code === 'credential_already_exists') {
        setCredentialConflictPrompt({
          providerId,
          label: label.trim(),
          scope: 'user',
          message:
            apiError.message ||
            'A credential already exists for this provider.',
        });
        setCredentialSubmitError(null);
        return;
      }

      setCredentialConflictPrompt(null);
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
      setDeleteCredentialError(null);
      setDeleteCredentialSuccessMessage('Credential deleted successfully.');
      setCredentialDeleteTarget(null);
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
    onError: (error) => {
      setDeleteCredentialError(
        error instanceof Error
          ? error.message
          : 'Unable to delete the provider credential.',
      );
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
    setCredentialEditMode('edit');
    setProviderId(resolvePreferredProviderId(providerOptions));
    setLabel('primary');
    setApiToken('');
    setBaseUrl('');
    setCredentialValidationError(null);
    setCredentialSubmitError(null);
    setCredentialConflictPrompt(null);
  }

  function beginCredentialEdit(
    credential: {
      id: string;
      providerId: string;
      label: string;
    },
    mode: 'edit' | 'replace' = 'edit',
  ) {
    setEditingCredentialId(credential.id);
    setCredentialEditMode(mode);
    setProviderId(credential.providerId);
    setLabel(credential.label);
    setApiToken('');
    setBaseUrl('');
    setCredentialValidationError(null);
    setCredentialSubmitError(null);
    setCredentialConflictPrompt(null);
  }

  async function resolveConflictingCredential() {
    const conflictPrompt = credentialConflictPrompt;
    if (!conflictPrompt) {
      return null;
    }

    const findMatch = (credentials: ProviderCredentialSummary[]) =>
      credentials.find(
        (credential) =>
          credential.providerId === conflictPrompt.providerId &&
          credential.scope === conflictPrompt.scope &&
          credential.label === conflictPrompt.label,
      ) ?? null;

    const existingCredentials = credentialsQuery.data ?? [];
    const existingMatch = findMatch(existingCredentials);
    if (existingMatch) {
      return existingMatch;
    }

    const refreshed = await credentialsQuery.refetch();
    return findMatch(refreshed.data ?? []);
  }

  async function handleConflictAction(mode: 'edit' | 'replace') {
    setCredentialSubmitError(null);
    const credential = await resolveConflictingCredential();
    if (!credential) {
      setCredentialConflictPrompt(null);
      setCredentialSubmitError(
        'The existing credential could not be loaded. Please refresh and try again.',
      );
      return;
    }

    beginCredentialEdit(credential, mode);
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

    if (
      !label.trim() ||
      (!editingCredentialId && !apiToken.trim() && !baseUrl.trim()) ||
      (credentialEditMode === 'replace' && !apiToken.trim() && !baseUrl.trim())
    ) {
      return;
    }

    const validationError = validateProviderCredentialInput({
      providerId,
      apiToken,
      baseUrl,
    });
    setCredentialValidationError(validationError);
    setCredentialSubmitError(null);
    setCredentialConflictPrompt(null);
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
    credentialConflictPrompt,
    credentialSubmitError,
    credentialValidationError,
    credentials: credentialsQuery.data ?? [],
    confirmDeleteCredential: (credential: ProviderCredentialSummary) => {
      setDeleteCredentialError(null);
      setDeleteCredentialSuccessMessage(null);
      setCredentialDeleteTarget(credential);
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
    deleteCredential: () => {
      if (!credentialDeleteTarget) {
        return;
      }
      setDeleteCredentialError(null);
      deleteCredentialMutation.mutate(credentialDeleteTarget.id);
    },
    deleteCredentialError,
    deleteCredentialSuccessMessage,
    credentialDeleteTarget,
    editingCredentialId,
    editingCredentialMode: credentialEditMode,
    handleCredentialSubmit,
    handleDefaultsSubmit,
    handleExistingCredentialEdit: () => {
      void handleConflictAction('edit');
    },
    handleExistingCredentialReplace: () => {
      void handleConflictAction('replace');
    },
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
      if (credentialConflictPrompt) {
        setCredentialConflictPrompt(null);
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
      if (credentialConflictPrompt) {
        setCredentialConflictPrompt(null);
      }
    },
    onCancelDeleteCredential: () => {
      setDeleteCredentialError(null);
      setCredentialDeleteTarget(null);
    },
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
    onLabelChange: (value: string) => {
      setLabel(value);
      if (credentialSubmitError) {
        setCredentialSubmitError(null);
      }
      if (credentialConflictPrompt) {
        setCredentialConflictPrompt(null);
      }
    },
    onProviderChange: (value: string | null) => {
      setProviderId(value ?? 'nanogpt');
      if (credentialValidationError) {
        setCredentialValidationError(null);
      }
      if (credentialSubmitError) {
        setCredentialSubmitError(null);
      }
      if (credentialConflictPrompt) {
        setCredentialConflictPrompt(null);
      }
    },
    providerId,
    providerOptions,
    providerSettingsDirty,
    resetCredentialForm,
    beginCredentialEdit,
  };
}

import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';

import {
  adminApiClient,
  type AdminTenantIntegrationApiKeySummary,
  type AdminTenantIntegrationClientSummary,
  type AdminTenantMembershipSummary,
  type AdminTenantModelAccessRuleSummary,
  type AdminTenantPolicySummary,
  type AdminTenantProviderConfigurationSummary,
  type AdminTenantSummary,
} from '../../../lib/api-client';
import { getActiveTenantLabel } from '../../../lib/tenant-context';
import { useSession } from '../../../lib/use-session';

export function useTenantsController() {
  const queryClient = useQueryClient();
  const sessionQuery = useSession();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [createOpened, createControls] = useDisclosure(false);
  const [createMemberOpened, createMemberControls] = useDisclosure(false);
  const [editMemberOpened, editMemberControls] = useDisclosure(false);
  const [editGlobalRolesOpened, editGlobalRolesControls] = useDisclosure(false);
  const [editProviderConfigurationOpened, editProviderConfigurationControls] =
    useDisclosure(false);
  const [editModelAccessRuleOpened, editModelAccessRuleControls] =
    useDisclosure(false);
  const [editIntegrationClientOpened, editIntegrationClientControls] =
    useDisclosure(false);
  const [editIntegrationApiKeyOpened, editIntegrationApiKeyControls] =
    useDisclosure(false);
  const [createSlug, setCreateSlug] = useState('');
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createAllowOverride, setCreateAllowOverride] = useState(true);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAllowOverride, setEditAllowOverride] = useState(true);
  const [editStatus, setEditStatus] = useState<'active' | 'disabled'>('active');
  const [memberDisplayName, setMemberDisplayName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberRoles, setMemberRoles] = useState<string[]>(['user']);
  const [selectedMembership, setSelectedMembership] =
    useState<AdminTenantMembershipSummary | null>(null);
  const [editMemberRoles, setEditMemberRoles] = useState<string[]>([]);
  const [editMemberStatus, setEditMemberStatus] =
    useState<'active' | 'disabled'>('active');
  const [editGlobalRoles, setEditGlobalRoles] = useState<string[]>([]);
  const [
    selectedProviderConfiguration,
    setSelectedProviderConfiguration,
  ] = useState<AdminTenantProviderConfigurationSummary | null>(null);
  const [selectedModelAccessRule, setSelectedModelAccessRule] =
    useState<AdminTenantModelAccessRuleSummary | null>(null);
  const [selectedIntegrationClient, setSelectedIntegrationClient] =
    useState<AdminTenantIntegrationClientSummary | null>(null);
  const [selectedIntegrationApiKey, setSelectedIntegrationApiKey] =
    useState<AdminTenantIntegrationApiKeySummary | null>(null);
  const [editProviderEnabled, setEditProviderEnabled] = useState(true);
  const [editProviderDefaultTextModel, setEditProviderDefaultTextModel] =
    useState('');
  const [editProviderDefaultImageModel, setEditProviderDefaultImageModel] =
    useState('');
  const [editProviderCredentialMode, setEditProviderCredentialMode] = useState<
    'platform_default' | 'tenant_byok' | 'user_byok' | 'hybrid'
  >('hybrid');
  const [editProviderPreferUserCredentials, setEditProviderPreferUserCredentials] =
    useState(true);
  const [editProviderAllowPlatformFallback, setEditProviderAllowPlatformFallback] =
    useState(false);
  const [editProviderAllowTenantFallback, setEditProviderAllowTenantFallback] =
    useState(true);
  const [editPolicyMonthlyBudgetUsd, setEditPolicyMonthlyBudgetUsd] =
    useState('');
  const [editPolicyDailyRequestLimit, setEditPolicyDailyRequestLimit] =
    useState('');
  const [editPolicyMonthlyRequestLimit, setEditPolicyMonthlyRequestLimit] =
    useState('');
  const [editPolicyRequestsPerMinute, setEditPolicyRequestsPerMinute] =
    useState('60');
  const [editPolicyTokensPerMinute, setEditPolicyTokensPerMinute] =
    useState('100000');
  const [editPolicyMonthlyTokenLimit, setEditPolicyMonthlyTokenLimit] =
    useState('');
  const [editPolicyImageRequestsPerMonth, setEditPolicyImageRequestsPerMonth] =
    useState('');
  const [editPolicyMaxInputTokens, setEditPolicyMaxInputTokens] = useState('');
  const [editPolicyMaxOutputTokens, setEditPolicyMaxOutputTokens] = useState('');
  const [editPolicyAllowPromptLogging, setEditPolicyAllowPromptLogging] =
    useState(false);
  const [editPolicyAllowResponseLogging, setEditPolicyAllowResponseLogging] =
    useState(false);
  const [editPolicyRetentionDays, setEditPolicyRetentionDays] = useState('30');
  const [editModelRuleProviderId, setEditModelRuleProviderId] = useState('nanogpt');
  const [editModelRulePattern, setEditModelRulePattern] = useState('*');
  const [editModelRuleCapability, setEditModelRuleCapability] = useState<
    'text' | 'image' | 'stt' | 'tts' | 'embedding'
  >('text');
  const [editModelRuleEffect, setEditModelRuleEffect] = useState<
    'allow' | 'deny'
  >('allow');
  const [editModelRulePriority, setEditModelRulePriority] = useState('100');
  const [editModelRuleMaxInputTokens, setEditModelRuleMaxInputTokens] =
    useState('');
  const [editModelRuleMaxOutputTokens, setEditModelRuleMaxOutputTokens] =
    useState('');
  const [editModelRuleMaxImagesPerRequest, setEditModelRuleMaxImagesPerRequest] =
    useState('');
  const [editModelRuleMaxResolution, setEditModelRuleMaxResolution] =
    useState('');
  const [editIntegrationClientId, setEditIntegrationClientId] = useState('');
  const [editIntegrationClientDisplayName, setEditIntegrationClientDisplayName] =
    useState('');
  const [editIntegrationClientApplicationId, setEditIntegrationClientApplicationId] =
    useState('');
  const [editIntegrationClientDefaultUserUuid, setEditIntegrationClientDefaultUserUuid] =
    useState('');
  const [editIntegrationClientScopes, setEditIntegrationClientScopes] = useState<
    Array<'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'>
  >(['chat:completion']);
  const [
    editIntegrationClientTrustedForwardedIdentityEnabled,
    setEditIntegrationClientTrustedForwardedIdentityEnabled,
  ] = useState(false);
  const [editIntegrationClientStatus, setEditIntegrationClientStatus] = useState<
    'active' | 'disabled'
  >('active');
  const [editIntegrationApiKeyLabel, setEditIntegrationApiKeyLabel] = useState('');
  const [editIntegrationApiKeyScopes, setEditIntegrationApiKeyScopes] = useState<
    Array<'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'>
  >([]);
  const [editIntegrationApiKeyExpiresAt, setEditIntegrationApiKeyExpiresAt] =
    useState('');
  const [editIntegrationApiKeyStatus, setEditIntegrationApiKeyStatus] = useState<
    'active' | 'disabled'
  >('active');
  const [revealedIntegrationApiKey, setRevealedIntegrationApiKey] = useState<{
    clientDisplayName: string;
    label: string;
    apiKey: string;
  } | null>(null);
  const selectedMembershipIsProtected =
    selectedMembership?.globalRoles.includes('super_admin') ?? false;
  const selectedMembershipIsSelf =
    selectedMembership?.userUuid === sessionQuery.data?.userUuid;

  const tenantsQuery = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => adminApiClient.getTenants(),
  });

  const selectedTenant =
    tenantsQuery.data?.find((tenant) => tenant.id === selectedTenantId) ?? null;

  useEffect(() => {
    if (!selectedTenantId && tenantsQuery.data?.length) {
      setSelectedTenantId(tenantsQuery.data[0].id);
    }
  }, [selectedTenantId, tenantsQuery.data]);

  useEffect(() => {
    if (!selectedTenant) {
      return;
    }

    setEditDisplayName(selectedTenant.displayName);
    setEditAllowOverride(selectedTenant.allowUserCredentialOverride);
    setEditStatus(selectedTenant.status);
  }, [selectedTenant]);

  const membershipsQuery = useQuery({
    queryKey: ['admin-tenant-memberships', selectedTenantId],
    queryFn: () => adminApiClient.getTenantMemberships(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
  });
  const providerConfigurationsQuery = useQuery({
    queryKey: ['admin-tenant-provider-configurations', selectedTenantId],
    queryFn: () => adminApiClient.getTenantProviderConfigurations(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
  });
  const modelAccessRulesQuery = useQuery({
    queryKey: ['admin-tenant-model-access-rules', selectedTenantId],
    queryFn: () => adminApiClient.getTenantModelAccessRules(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
  });
  const tenantPolicyQuery = useQuery({
    queryKey: ['admin-tenant-policy', selectedTenantId],
    queryFn: () => adminApiClient.getTenantPolicy(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
  });
  const integrationClientsQuery = useQuery({
    queryKey: ['admin-tenant-integration-clients', selectedTenantId],
    queryFn: () => adminApiClient.getTenantIntegrationClients(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
  });
  const integrationApiKeysQuery = useQuery({
    queryKey: [
      'admin-tenant-integration-api-keys',
      selectedTenantId,
      selectedIntegrationClient?.id ?? null,
    ],
    queryFn: () =>
      adminApiClient.getTenantIntegrationApiKeys(
        selectedTenantId!,
        selectedIntegrationClient!.id,
      ),
    enabled: Boolean(selectedTenantId && selectedIntegrationClient),
  });

  useEffect(() => {
    if (!tenantPolicyQuery.data) {
      return;
    }

    hydrateTenantPolicyForm(tenantPolicyQuery.data);
  }, [tenantPolicyQuery.data]);

  useEffect(() => {
    if (!integrationClientsQuery.data?.length) {
      setSelectedIntegrationClient(null);
      return;
    }

    if (
      selectedIntegrationClient &&
      integrationClientsQuery.data.some(
        (client) => client.id === selectedIntegrationClient.id,
      )
    ) {
      return;
    }

    setSelectedIntegrationClient(integrationClientsQuery.data[0]);
  }, [integrationClientsQuery.data, selectedIntegrationClient]);

  const createTenantMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createTenant({
        slug: createSlug.trim(),
        displayName: createDisplayName.trim(),
        allowUserCredentialOverride: createAllowOverride,
      }),
    onSuccess: async (tenant) => {
      resetCreateForm();
      createControls.close();
      setSelectedTenantId(tenant.id);
      await queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenant(selectedTenantId!, {
        displayName: editDisplayName.trim(),
        allowUserCredentialOverride: editAllowOverride,
        status: editStatus,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-memberships', selectedTenantId],
      });
    },
  });

  const createTenantUserMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createTenantUser(selectedTenantId!, {
        email: memberEmail.trim(),
        password: memberPassword,
        displayName: memberDisplayName.trim(),
        roles: memberRoles,
      }),
    onSuccess: async () => {
      resetMemberForm();
      createMemberControls.close();
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-memberships', selectedTenantId],
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
  });

  const updateTenantUserMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenantUser(
        selectedTenantId!,
        selectedMembership!.userUuid,
        {
          roles: editMemberRoles,
          status: editMemberStatus,
        },
      ),
    onSuccess: async () => {
      editMemberControls.close();
      setSelectedMembership(null);
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-memberships', selectedTenantId],
      });
    },
  });
  const updateGlobalRolesMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateUserGlobalRoles(selectedMembership!.userUuid, {
        globalRoles: editGlobalRoles,
      }),
    onSuccess: async () => {
      editGlobalRolesControls.close();
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-memberships', selectedTenantId],
      });
      await queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
  const updateTenantProviderConfigurationMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenantProviderConfiguration(
        selectedTenantId!,
        selectedProviderConfiguration!.providerId,
        {
          enabled: editProviderEnabled,
          defaultTextModel: editProviderDefaultTextModel.trim(),
          defaultImageModel: editProviderDefaultImageModel.trim(),
          credentialMode: editProviderCredentialMode,
          preferUserCredentials: editProviderPreferUserCredentials,
          allowPlatformFallback: editProviderAllowPlatformFallback,
          allowTenantFallback: editProviderAllowTenantFallback,
        },
      ),
    onSuccess: async (configuration) => {
      setSelectedProviderConfiguration(configuration);
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-provider-configurations', selectedTenantId],
      });
    },
  });
  const testTenantProviderConfigurationMutation = useMutation({
    mutationFn: () =>
      adminApiClient.testTenantProviderConfiguration(
        selectedTenantId!,
        selectedProviderConfiguration!.providerId,
    ),
  });
  const updateTenantPolicyMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenantPolicy(selectedTenantId!, {
        monthlyBudgetUsd: editPolicyMonthlyBudgetUsd.trim() || undefined,
        dailyRequestLimit: parseOptionalNumber(editPolicyDailyRequestLimit),
        monthlyRequestLimit: parseOptionalNumber(editPolicyMonthlyRequestLimit),
        requestsPerMinute: parseOptionalNumber(editPolicyRequestsPerMinute),
        tokensPerMinute: parseOptionalNumber(editPolicyTokensPerMinute),
        monthlyTokenLimit: parseOptionalNumber(editPolicyMonthlyTokenLimit),
        imageRequestsPerMonth: parseOptionalNumber(
          editPolicyImageRequestsPerMonth,
        ),
        maxInputTokens: parseOptionalNumber(editPolicyMaxInputTokens),
        maxOutputTokens: parseOptionalNumber(editPolicyMaxOutputTokens),
        allowPromptLogging: editPolicyAllowPromptLogging,
        allowResponseLogging: editPolicyAllowResponseLogging,
        retentionDays: parseOptionalNumber(editPolicyRetentionDays),
      }),
    onSuccess: async (policy) => {
      hydrateTenantPolicyForm(policy);
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-policy', selectedTenantId],
      });
    },
  });
  const createTenantModelAccessRuleMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createTenantModelAccessRule(selectedTenantId!, {
        providerId: editModelRuleProviderId,
        modelPattern: editModelRulePattern.trim(),
        capability: editModelRuleCapability,
        effect: editModelRuleEffect,
        maxInputTokens: parseOptionalNumber(editModelRuleMaxInputTokens),
        maxOutputTokens: parseOptionalNumber(editModelRuleMaxOutputTokens),
        maxImagesPerRequest: parseOptionalNumber(editModelRuleMaxImagesPerRequest),
        maxResolution: editModelRuleMaxResolution.trim() || undefined,
        priority: parseOptionalNumber(editModelRulePriority) ?? 100,
      }),
    onSuccess: async () => {
      editModelAccessRuleControls.close();
      resetModelRuleForm();
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-model-access-rules', selectedTenantId],
      });
    },
  });
  const updateTenantModelAccessRuleMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenantModelAccessRule(
        selectedTenantId!,
        selectedModelAccessRule!.id,
        {
          providerId: editModelRuleProviderId,
          modelPattern: editModelRulePattern.trim(),
          capability: editModelRuleCapability,
          effect: editModelRuleEffect,
          maxInputTokens: parseOptionalNumber(editModelRuleMaxInputTokens),
          maxOutputTokens: parseOptionalNumber(editModelRuleMaxOutputTokens),
          maxImagesPerRequest: parseOptionalNumber(editModelRuleMaxImagesPerRequest),
          maxResolution: editModelRuleMaxResolution.trim() || undefined,
          priority: parseOptionalNumber(editModelRulePriority) ?? 100,
        },
      ),
    onSuccess: async () => {
      editModelAccessRuleControls.close();
      setSelectedModelAccessRule(null);
      resetModelRuleForm();
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-model-access-rules', selectedTenantId],
      });
    },
  });
  const deleteTenantModelAccessRuleMutation = useMutation({
    mutationFn: () =>
      adminApiClient.deleteTenantModelAccessRule(
        selectedTenantId!,
        selectedModelAccessRule!.id,
      ),
    onSuccess: async () => {
      editModelAccessRuleControls.close();
      setSelectedModelAccessRule(null);
      resetModelRuleForm();
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-model-access-rules', selectedTenantId],
      });
    },
  });
  const createTenantIntegrationClientMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createTenantIntegrationClient(selectedTenantId!, {
        clientId: editIntegrationClientId.trim(),
        displayName: editIntegrationClientDisplayName.trim(),
        applicationId: editIntegrationClientApplicationId.trim(),
        defaultUserUuid: editIntegrationClientDefaultUserUuid.trim() || undefined,
        scopes: editIntegrationClientScopes,
        trustedForwardedIdentityEnabled:
          editIntegrationClientTrustedForwardedIdentityEnabled,
      }),
    onSuccess: async (client) => {
      editIntegrationClientControls.close();
      resetIntegrationClientForm();
      setSelectedIntegrationClient(client);
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-integration-clients', selectedTenantId],
      });
    },
  });
  const updateTenantIntegrationClientMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenantIntegrationClient(
        selectedTenantId!,
        selectedIntegrationClient!.id,
        {
          displayName: editIntegrationClientDisplayName.trim(),
          applicationId: editIntegrationClientApplicationId.trim(),
          defaultUserUuid:
            editIntegrationClientDefaultUserUuid.trim() || undefined,
          scopes: editIntegrationClientScopes,
          trustedForwardedIdentityEnabled:
            editIntegrationClientTrustedForwardedIdentityEnabled,
          status: editIntegrationClientStatus,
        },
      ),
    onSuccess: async (client) => {
      editIntegrationClientControls.close();
      setSelectedIntegrationClient(client);
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-integration-clients', selectedTenantId],
      });
      await queryClient.invalidateQueries({
        queryKey: [
          'admin-tenant-integration-api-keys',
          selectedTenantId,
          client.id,
        ],
      });
    },
  });
  const createTenantIntegrationApiKeyMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createTenantIntegrationApiKey(
        selectedTenantId!,
        selectedIntegrationClient!.id,
        {
          label: editIntegrationApiKeyLabel.trim(),
          scopes: editIntegrationApiKeyScopes.length
            ? editIntegrationApiKeyScopes
            : undefined,
          expiresAt: editIntegrationApiKeyExpiresAt.trim() || undefined,
        },
      ),
    onSuccess: async (result) => {
      editIntegrationApiKeyControls.close();
      setSelectedIntegrationApiKey(result.summary);
      setRevealedIntegrationApiKey({
        clientDisplayName:
          selectedIntegrationClient?.displayName ?? result.summary.integrationClientClientId,
        label: result.summary.label,
        apiKey: result.apiKey,
      });
      resetIntegrationApiKeyForm();
      await queryClient.invalidateQueries({
        queryKey: [
          'admin-tenant-integration-api-keys',
          selectedTenantId,
          selectedIntegrationClient?.id ?? null,
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: ['admin-tenant-integration-clients', selectedTenantId],
      });
    },
  });
  const updateTenantIntegrationApiKeyMutation = useMutation({
    mutationFn: () =>
      adminApiClient.updateTenantIntegrationApiKey(
        selectedTenantId!,
        selectedIntegrationClient!.id,
        selectedIntegrationApiKey!.id,
        {
          label: editIntegrationApiKeyLabel.trim(),
          scopes: editIntegrationApiKeyScopes.length
            ? editIntegrationApiKeyScopes
            : undefined,
          expiresAt: editIntegrationApiKeyExpiresAt.trim() || undefined,
          status: editIntegrationApiKeyStatus,
        },
      ),
    onSuccess: async (apiKey) => {
      editIntegrationApiKeyControls.close();
      setSelectedIntegrationApiKey(apiKey);
      await queryClient.invalidateQueries({
        queryKey: [
          'admin-tenant-integration-api-keys',
          selectedTenantId,
          selectedIntegrationClient?.id ?? null,
        ],
      });
    },
  });
  const rotateTenantIntegrationApiKeyMutation = useMutation({
    mutationFn: () =>
      adminApiClient.rotateTenantIntegrationApiKey(
        selectedTenantId!,
        selectedIntegrationClient!.id,
        selectedIntegrationApiKey!.id,
      ),
    onSuccess: async (result) => {
      setSelectedIntegrationApiKey(result.summary);
      setRevealedIntegrationApiKey({
        clientDisplayName:
          selectedIntegrationClient?.displayName ?? result.summary.integrationClientClientId,
        label: result.summary.label,
        apiKey: result.apiKey,
      });
      await queryClient.invalidateQueries({
        queryKey: [
          'admin-tenant-integration-api-keys',
          selectedTenantId,
          selectedIntegrationClient?.id ?? null,
        ],
      });
    },
  });

  const tenantCards = useMemo(
    () => tenantsQuery.data ?? [],
    [tenantsQuery.data],
  );

  function resetCreateForm() {
    setCreateSlug('');
    setCreateDisplayName('');
    setCreateAllowOverride(true);
  }

  function resetMemberForm() {
    setMemberDisplayName('');
    setMemberEmail('');
    setMemberPassword('');
    setMemberRoles(['user']);
  }

  function resetModelRuleForm() {
    setEditModelRuleProviderId('nanogpt');
    setEditModelRulePattern('*');
    setEditModelRuleCapability('text');
    setEditModelRuleEffect('allow');
    setEditModelRulePriority('100');
    setEditModelRuleMaxInputTokens('');
    setEditModelRuleMaxOutputTokens('');
    setEditModelRuleMaxImagesPerRequest('');
    setEditModelRuleMaxResolution('');
  }

  function resetIntegrationClientForm() {
    setEditIntegrationClientId('');
    setEditIntegrationClientDisplayName('');
    setEditIntegrationClientApplicationId('');
    setEditIntegrationClientDefaultUserUuid('');
    setEditIntegrationClientScopes(['chat:completion']);
    setEditIntegrationClientTrustedForwardedIdentityEnabled(false);
    setEditIntegrationClientStatus('active');
  }

  function resetIntegrationApiKeyForm() {
    setEditIntegrationApiKeyLabel('');
    setEditIntegrationApiKeyScopes([]);
    setEditIntegrationApiKeyExpiresAt('');
    setEditIntegrationApiKeyStatus('active');
  }

  function hydrateTenantPolicyForm(policy: AdminTenantPolicySummary) {
    setEditPolicyMonthlyBudgetUsd(policy.monthlyBudgetUsd ?? '');
    setEditPolicyDailyRequestLimit(
      policy.dailyRequestLimit === null ? '' : String(policy.dailyRequestLimit),
    );
    setEditPolicyMonthlyRequestLimit(
      policy.monthlyRequestLimit === null
        ? ''
        : String(policy.monthlyRequestLimit),
    );
    setEditPolicyRequestsPerMinute(String(policy.requestsPerMinute));
    setEditPolicyTokensPerMinute(String(policy.tokensPerMinute));
    setEditPolicyMonthlyTokenLimit(
      policy.monthlyTokenLimit === null ? '' : String(policy.monthlyTokenLimit),
    );
    setEditPolicyImageRequestsPerMonth(
      policy.imageRequestsPerMonth === null
        ? ''
        : String(policy.imageRequestsPerMonth),
    );
    setEditPolicyMaxInputTokens(
      policy.maxInputTokens === null ? '' : String(policy.maxInputTokens),
    );
    setEditPolicyMaxOutputTokens(
      policy.maxOutputTokens === null ? '' : String(policy.maxOutputTokens),
    );
    setEditPolicyAllowPromptLogging(policy.allowPromptLogging);
    setEditPolicyAllowResponseLogging(policy.allowResponseLogging);
    setEditPolicyRetentionDays(String(policy.retentionDays));
  }

  function handleCreateTenantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!createSlug.trim() || !createDisplayName.trim()) {
      return;
    }

    createTenantMutation.mutate();
  }

  function handleUpdateTenantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenantId || !editDisplayName.trim()) {
      return;
    }

    updateTenantMutation.mutate();
  }

  function handleUpdateTenantPolicySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenantId) {
      return;
    }

    updateTenantPolicyMutation.mutate();
  }

  function handleCreateTenantUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTenantId || !memberEmail.trim()) {
      return;
    }

    const isProvisioningNewUser =
      memberDisplayName.trim().length > 0 || memberPassword.trim().length > 0;
    if (
      isProvisioningNewUser &&
      (!memberDisplayName.trim() || memberPassword.trim().length < 8)
    ) {
      return;
    }

    createTenantUserMutation.mutate();
  }

  function handleUpdateTenantUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !selectedTenantId ||
      !selectedMembership ||
      selectedMembershipIsProtected
    ) {
      return;
    }

    updateTenantUserMutation.mutate();
  }

  function handleUpdateGlobalRolesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMembership) {
      return;
    }

    updateGlobalRolesMutation.mutate();
  }

  function handleUpsertTenantModelAccessRuleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (!selectedTenantId || !editModelRulePattern.trim()) {
      return;
    }

    if (selectedModelAccessRule) {
      updateTenantModelAccessRuleMutation.mutate();
      return;
    }

    createTenantModelAccessRuleMutation.mutate();
  }

  function handleUpsertTenantIntegrationClientSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (
      !selectedTenantId ||
      !editIntegrationClientDisplayName.trim() ||
      !editIntegrationClientApplicationId.trim()
    ) {
      return;
    }

    if (!selectedIntegrationClient && !editIntegrationClientId.trim()) {
      return;
    }

    if (selectedIntegrationClient) {
      updateTenantIntegrationClientMutation.mutate();
      return;
    }

    createTenantIntegrationClientMutation.mutate();
  }

  function handleUpsertTenantIntegrationApiKeySubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    if (
      !selectedTenantId ||
      !selectedIntegrationClient ||
      !editIntegrationApiKeyLabel.trim()
    ) {
      return;
    }

    if (selectedIntegrationApiKey) {
      updateTenantIntegrationApiKeyMutation.mutate();
      return;
    }

    createTenantIntegrationApiKeyMutation.mutate();
  }

  const integrationClientMemberOptions = useMemo(
    () =>
      (membershipsQuery.data ?? []).map((membership) => ({
        value: membership.userUuid,
        label: `${membership.displayName} (${membership.email})`,
      })),
    [membershipsQuery.data],
  );

  return {
    createMemberDisplayName: memberDisplayName,
    createMemberEmail: memberEmail,
    createMemberOpened,
    createMemberPassword: memberPassword,
    createMemberRoles: memberRoles,
    createAllowOverride,
    createDisplayName,
    createOpened,
    createSlug,
    editGlobalRoles,
    editGlobalRolesOpened,
    editMemberOpened,
    editMemberRoles,
    editMemberStatus,
    handleCreateTenantSubmit,
    handleCreateTenantUserSubmit,
    handleUpdateGlobalRolesSubmit,
    handleUpdateTenantSubmit,
    handleUpdateTenantUserSubmit,
    isCreatePending: createTenantMutation.isPending,
    isCreateTenantUserPending: createTenantUserMutation.isPending,
    isUpdateGlobalRolesPending: updateGlobalRolesMutation.isPending,
    isUpdatePending: updateTenantMutation.isPending,
    isUpdateTenantUserPending: updateTenantUserMutation.isPending,
    memberships: membershipsQuery.data ?? [],
    membershipsQuery,
    integrationClients: integrationClientsQuery.data ?? [],
    integrationClientsQuery,
    integrationApiKeys: integrationApiKeysQuery.data ?? [],
    integrationApiKeysQuery,
    modelAccessRules: modelAccessRulesQuery.data ?? [],
    modelAccessRulesQuery,
    tenantPolicy: tenantPolicyQuery.data ?? null,
    tenantPolicyQuery,
    providerConfigurations: providerConfigurationsQuery.data ?? [],
    providerConfigurationsQuery,
    onCloseCreate: () => {
      createControls.close();
      resetCreateForm();
    },
    onCloseCreateMember: () => {
      createMemberControls.close();
      resetMemberForm();
    },
    onCreateAllowOverrideChange: setCreateAllowOverride,
    onCreateDisplayNameChange: setCreateDisplayName,
    onCreateSlugChange: setCreateSlug,
    onOpenCreate: createControls.open,
    onOpenCreateMember: createMemberControls.open,
    onCreateMemberDisplayNameChange: setMemberDisplayName,
    onCreateMemberEmailChange: setMemberEmail,
    onCreateMemberPasswordChange: setMemberPassword,
    onCreateMemberRolesChange: setMemberRoles,
    onSelectTenant: (tenant: AdminTenantSummary) => setSelectedTenantId(tenant.id),
    onEditAllowOverrideChange: setEditAllowOverride,
    onEditDisplayNameChange: setEditDisplayName,
    onEditGlobalRolesChange: setEditGlobalRoles,
    onEditMemberRolesChange: setEditMemberRoles,
    onEditMemberStatusChange: (value: string | null) => {
      if (value === 'active' || value === 'disabled') {
        setEditMemberStatus(value);
      }
    },
    onOpenEditMember: (membership: AdminTenantMembershipSummary) => {
      setSelectedMembership(membership);
      setEditMemberRoles(membership.roles);
      setEditMemberStatus(membership.status);
      editMemberControls.open();
    },
    onCloseEditMember: () => {
      editMemberControls.close();
      setSelectedMembership(null);
    },
    onOpenEditGlobalRoles: (membership: AdminTenantMembershipSummary) => {
      setSelectedMembership(membership);
      setEditGlobalRoles(membership.globalRoles);
      editGlobalRolesControls.open();
    },
    onOpenEditProviderConfiguration: (
      configuration: AdminTenantProviderConfigurationSummary,
    ) => {
      setSelectedProviderConfiguration(configuration);
      setEditProviderEnabled(configuration.enabled);
      setEditProviderDefaultTextModel(configuration.defaultTextModel ?? '');
      setEditProviderDefaultImageModel(configuration.defaultImageModel ?? '');
      setEditProviderCredentialMode(configuration.credentialMode);
      setEditProviderPreferUserCredentials(
        configuration.preferUserCredentials,
      );
      setEditProviderAllowPlatformFallback(
        configuration.allowPlatformFallback,
      );
      setEditProviderAllowTenantFallback(configuration.allowTenantFallback);
      testTenantProviderConfigurationMutation.reset();
      editProviderConfigurationControls.open();
    },
    onCloseEditProviderConfiguration: () => {
      editProviderConfigurationControls.close();
      setSelectedProviderConfiguration(null);
      testTenantProviderConfigurationMutation.reset();
    },
    onOpenCreateModelAccessRule: () => {
      setSelectedModelAccessRule(null);
      resetModelRuleForm();
      editModelAccessRuleControls.open();
    },
    onOpenEditModelAccessRule: (
      rule: AdminTenantModelAccessRuleSummary,
    ) => {
      setSelectedModelAccessRule(rule);
      setEditModelRuleProviderId(rule.providerId);
      setEditModelRulePattern(rule.modelPattern);
      setEditModelRuleCapability(rule.capability);
      setEditModelRuleEffect(rule.effect);
      setEditModelRulePriority(String(rule.priority));
      setEditModelRuleMaxInputTokens(
        rule.maxInputTokens === null ? '' : String(rule.maxInputTokens),
      );
      setEditModelRuleMaxOutputTokens(
        rule.maxOutputTokens === null ? '' : String(rule.maxOutputTokens),
      );
      setEditModelRuleMaxImagesPerRequest(
        rule.maxImagesPerRequest === null
          ? ''
          : String(rule.maxImagesPerRequest),
      );
      setEditModelRuleMaxResolution(rule.maxResolution ?? '');
      editModelAccessRuleControls.open();
    },
    onCloseEditModelAccessRule: () => {
      editModelAccessRuleControls.close();
      setSelectedModelAccessRule(null);
      resetModelRuleForm();
    },
    onCloseEditGlobalRoles: () => {
      editGlobalRolesControls.close();
      setSelectedMembership(null);
      setEditGlobalRoles([]);
    },
    onEditProviderEnabledChange: setEditProviderEnabled,
    onEditProviderDefaultTextModelChange: setEditProviderDefaultTextModel,
    onEditProviderDefaultImageModelChange: setEditProviderDefaultImageModel,
    onEditProviderCredentialModeChange: (value: string | null) => {
      if (
        value === 'platform_default' ||
        value === 'tenant_byok' ||
        value === 'user_byok' ||
        value === 'hybrid'
      ) {
        setEditProviderCredentialMode(value);
      }
    },
    onEditProviderPreferUserCredentialsChange:
      setEditProviderPreferUserCredentials,
    onEditProviderAllowPlatformFallbackChange:
      setEditProviderAllowPlatformFallback,
    onEditProviderAllowTenantFallbackChange: setEditProviderAllowTenantFallback,
    handleUpdateTenantPolicySubmit,
    editPolicyMonthlyBudgetUsd,
    editPolicyDailyRequestLimit,
    editPolicyMonthlyRequestLimit,
    editPolicyRequestsPerMinute,
    editPolicyTokensPerMinute,
    editPolicyMonthlyTokenLimit,
    editPolicyImageRequestsPerMonth,
    editPolicyMaxInputTokens,
    editPolicyMaxOutputTokens,
    editPolicyAllowPromptLogging,
    editPolicyAllowResponseLogging,
    editPolicyRetentionDays,
    onEditPolicyMonthlyBudgetUsdChange: setEditPolicyMonthlyBudgetUsd,
    onEditPolicyDailyRequestLimitChange: setEditPolicyDailyRequestLimit,
    onEditPolicyMonthlyRequestLimitChange: setEditPolicyMonthlyRequestLimit,
    onEditPolicyRequestsPerMinuteChange: setEditPolicyRequestsPerMinute,
    onEditPolicyTokensPerMinuteChange: setEditPolicyTokensPerMinute,
    onEditPolicyMonthlyTokenLimitChange: setEditPolicyMonthlyTokenLimit,
    onEditPolicyImageRequestsPerMonthChange:
      setEditPolicyImageRequestsPerMonth,
    onEditPolicyMaxInputTokensChange: setEditPolicyMaxInputTokens,
    onEditPolicyMaxOutputTokensChange: setEditPolicyMaxOutputTokens,
    onEditPolicyAllowPromptLoggingChange: setEditPolicyAllowPromptLogging,
    onEditPolicyAllowResponseLoggingChange: setEditPolicyAllowResponseLogging,
    onEditPolicyRetentionDaysChange: setEditPolicyRetentionDays,
    isUpdateTenantPolicyPending: updateTenantPolicyMutation.isPending,
    editModelAccessRuleOpened,
    selectedModelAccessRule,
    editModelRuleProviderId,
    editModelRulePattern,
    editModelRuleCapability,
    editModelRuleEffect,
    editModelRulePriority,
    editModelRuleMaxInputTokens,
    editModelRuleMaxOutputTokens,
    editModelRuleMaxImagesPerRequest,
    editModelRuleMaxResolution,
    onEditModelRuleProviderIdChange: (value: string | null) => {
      if (value) {
        setEditModelRuleProviderId(value);
      }
    },
    onEditModelRulePatternChange: setEditModelRulePattern,
    onEditModelRuleCapabilityChange: (value: string | null) => {
      if (
        value === 'text' ||
        value === 'image' ||
        value === 'stt' ||
        value === 'tts' ||
        value === 'embedding'
      ) {
        setEditModelRuleCapability(value);
      }
    },
    onEditModelRuleEffectChange: (value: string | null) => {
      if (value === 'allow' || value === 'deny') {
        setEditModelRuleEffect(value);
      }
    },
    onEditModelRulePriorityChange: setEditModelRulePriority,
    onEditModelRuleMaxInputTokensChange: setEditModelRuleMaxInputTokens,
    onEditModelRuleMaxOutputTokensChange: setEditModelRuleMaxOutputTokens,
    onEditModelRuleMaxImagesPerRequestChange:
      setEditModelRuleMaxImagesPerRequest,
    onEditModelRuleMaxResolutionChange: setEditModelRuleMaxResolution,
    handleUpsertTenantModelAccessRuleSubmit,
    handleDeleteTenantModelAccessRule: () => {
      if (!selectedTenantId || !selectedModelAccessRule) {
        return;
      }

      deleteTenantModelAccessRuleMutation.mutate();
    },
    isCreateTenantModelAccessRulePending:
      createTenantModelAccessRuleMutation.isPending,
    isUpdateTenantModelAccessRulePending:
      updateTenantModelAccessRuleMutation.isPending,
    isDeleteTenantModelAccessRulePending:
      deleteTenantModelAccessRuleMutation.isPending,
    isCreateTenantIntegrationClientPending:
      createTenantIntegrationClientMutation.isPending,
    isUpdateTenantIntegrationClientPending:
      updateTenantIntegrationClientMutation.isPending,
    isCreateTenantIntegrationApiKeyPending:
      createTenantIntegrationApiKeyMutation.isPending,
    isUpdateTenantIntegrationApiKeyPending:
      updateTenantIntegrationApiKeyMutation.isPending,
    isRotateTenantIntegrationApiKeyPending:
      rotateTenantIntegrationApiKeyMutation.isPending,
    handleUpdateTenantProviderConfigurationSubmit: (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();
      if (!selectedTenantId || !selectedProviderConfiguration) {
        return;
      }

      updateTenantProviderConfigurationMutation.mutate();
    },
    handleTestTenantProviderConfiguration: () => {
      if (!selectedTenantId || !selectedProviderConfiguration) {
        return;
      }

      testTenantProviderConfigurationMutation.mutate();
    },
    onEditStatusChange: (value: string | null) => {
      if (value === 'active' || value === 'disabled') {
        setEditStatus(value);
      }
    },
    activeTenantLabel: getActiveTenantLabel(sessionQuery.data),
    selectedMembershipIsSelf,
    selectedMembershipIsProtected,
    selectedMembership,
    selectedProviderConfiguration,
    selectedIntegrationClient,
    selectedIntegrationApiKey,
    selectedTenant,
    tenantCards,
    tenantsQuery,
    editProviderConfigurationOpened,
    editProviderEnabled,
    editProviderDefaultTextModel,
    editProviderDefaultImageModel,
    editProviderCredentialMode,
    editProviderPreferUserCredentials,
    editProviderAllowPlatformFallback,
    editProviderAllowTenantFallback,
    editIntegrationClientOpened,
    editIntegrationApiKeyOpened,
    editIntegrationClientId,
    editIntegrationClientDisplayName,
    editIntegrationClientApplicationId,
    editIntegrationClientDefaultUserUuid,
    editIntegrationClientScopes,
    editIntegrationClientTrustedForwardedIdentityEnabled,
    editIntegrationClientStatus,
    editIntegrationApiKeyLabel,
    editIntegrationApiKeyScopes,
    editIntegrationApiKeyExpiresAt,
    editIntegrationApiKeyStatus,
    integrationClientMemberOptions,
    revealedIntegrationApiKey,
    isUpdateTenantProviderConfigurationPending:
      updateTenantProviderConfigurationMutation.isPending,
    isTestTenantProviderConfigurationPending:
      testTenantProviderConfigurationMutation.isPending,
    testTenantProviderConfigurationResult:
      testTenantProviderConfigurationMutation.data ?? null,
    updateGlobalRolesError:
      updateGlobalRolesMutation.error instanceof Error
        ? updateGlobalRolesMutation.error.message
        : null,
    onDismissRevealedIntegrationApiKey: () => setRevealedIntegrationApiKey(null),
    onSelectIntegrationClient: (
      integrationClient: AdminTenantIntegrationClientSummary,
    ) => {
      setSelectedIntegrationClient(integrationClient);
      setSelectedIntegrationApiKey(null);
    },
    onOpenCreateIntegrationClient: () => {
      setSelectedIntegrationClient(null);
      resetIntegrationClientForm();
      editIntegrationClientControls.open();
    },
    onOpenEditIntegrationClient: (
      integrationClient: AdminTenantIntegrationClientSummary,
    ) => {
      setSelectedIntegrationClient(integrationClient);
      setEditIntegrationClientId(integrationClient.clientId);
      setEditIntegrationClientDisplayName(integrationClient.displayName);
      setEditIntegrationClientApplicationId(integrationClient.applicationId);
      setEditIntegrationClientDefaultUserUuid(
        integrationClient.defaultUserUuid ?? '',
      );
      setEditIntegrationClientScopes(
        integrationClient.scopes as Array<
          'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'
        >,
      );
      setEditIntegrationClientTrustedForwardedIdentityEnabled(
        integrationClient.trustedForwardedIdentityEnabled,
      );
      setEditIntegrationClientStatus(integrationClient.status);
      editIntegrationClientControls.open();
    },
    onCloseEditIntegrationClient: () => {
      editIntegrationClientControls.close();
      if (!selectedIntegrationClient) {
        resetIntegrationClientForm();
      }
    },
    onEditIntegrationClientIdChange: setEditIntegrationClientId,
    onEditIntegrationClientDisplayNameChange:
      setEditIntegrationClientDisplayName,
    onEditIntegrationClientApplicationIdChange:
      setEditIntegrationClientApplicationId,
    onEditIntegrationClientDefaultUserUuidChange:
      setEditIntegrationClientDefaultUserUuid,
    onEditIntegrationClientScopesChange: (value: string[]) =>
      setEditIntegrationClientScopes(
        value as Array<
          'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'
        >,
      ),
    onEditIntegrationClientTrustedForwardedIdentityEnabledChange:
      setEditIntegrationClientTrustedForwardedIdentityEnabled,
    onEditIntegrationClientStatusChange: (value: string | null) => {
      if (value === 'active' || value === 'disabled') {
        setEditIntegrationClientStatus(value);
      }
    },
    handleUpsertTenantIntegrationClientSubmit,
    onOpenCreateIntegrationApiKey: (
      integrationClient: AdminTenantIntegrationClientSummary,
    ) => {
      setSelectedIntegrationClient(integrationClient);
      setSelectedIntegrationApiKey(null);
      resetIntegrationApiKeyForm();
      editIntegrationApiKeyControls.open();
    },
    onOpenEditIntegrationApiKey: (
      integrationClient: AdminTenantIntegrationClientSummary,
      apiKey: AdminTenantIntegrationApiKeySummary,
    ) => {
      setSelectedIntegrationClient(integrationClient);
      setSelectedIntegrationApiKey(apiKey);
      setEditIntegrationApiKeyLabel(apiKey.label);
      setEditIntegrationApiKeyScopes(
        apiKey.scopes as Array<
          'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'
        >,
      );
      setEditIntegrationApiKeyExpiresAt(
        apiKey.expiresAt ? apiKey.expiresAt.slice(0, 16) : '',
      );
      setEditIntegrationApiKeyStatus(apiKey.status);
      editIntegrationApiKeyControls.open();
    },
    onCloseEditIntegrationApiKey: () => {
      editIntegrationApiKeyControls.close();
      setSelectedIntegrationApiKey(null);
      resetIntegrationApiKeyForm();
    },
    onEditIntegrationApiKeyLabelChange: setEditIntegrationApiKeyLabel,
    onEditIntegrationApiKeyScopesChange: (value: string[]) =>
      setEditIntegrationApiKeyScopes(
        value as Array<
          'chat:completion' | 'image:generate' | 'image:edit' | 'models:list'
        >,
      ),
    onEditIntegrationApiKeyExpiresAtChange: setEditIntegrationApiKeyExpiresAt,
    onEditIntegrationApiKeyStatusChange: (value: string | null) => {
      if (value === 'active' || value === 'disabled') {
        setEditIntegrationApiKeyStatus(value);
      }
    },
    handleUpsertTenantIntegrationApiKeySubmit,
    handleRotateTenantIntegrationApiKey: () => {
      if (!selectedTenantId || !selectedIntegrationClient || !selectedIntegrationApiKey) {
        return;
      }

      rotateTenantIntegrationApiKeyMutation.mutate();
    },
    editAllowOverride,
    editDisplayName,
    editStatus,
  };
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

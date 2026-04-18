import { Alert, Grid, Stack } from '@mantine/core';

import { ProviderCredentialForm } from '../features/providers/components/provider-credential-form';
import { ProviderCredentialsPanel } from '../features/providers/components/provider-credentials-panel';
import { ProviderDefaultsForm } from '../features/providers/components/provider-defaults-form';
import { useProvidersController } from '../features/providers/hooks/use-providers-controller';
import { PageHeader } from '../components/page-header';

export function ProvidersPage() {
  const {
    apiToken,
    beginCredentialEdit,
    credentials,
    currentDefaultModel,
    currentDefaultProviderDisplayName,
    currentDefaultProviderId,
    defaultModel,
    defaultModelOptions,
    defaultProviderId,
    defaultProviderOptions,
    editingCredentialId,
    handleCredentialSubmit,
    handleDefaultsSubmit,
    isCredentialPending,
    isDefaultsPending,
    isModelLoading,
    label,
    modelErrorMessage,
    onApiTokenChange,
    onDefaultModelChange,
    onDefaultProviderChange,
    onLabelChange,
    onProviderChange,
    providerId,
    providerOptions,
    providerSettingsDirty,
    resetCredentialForm,
  } = useProvidersController();

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
              isPending={isCredentialPending}
              label={label}
              onApiTokenChange={onApiTokenChange}
              onCancelEdit={resetCredentialForm}
              onLabelChange={onLabelChange}
              onProviderChange={onProviderChange}
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
              isModelLoading={isModelLoading}
              isPending={isDefaultsPending}
              modelErrorMessage={modelErrorMessage}
              onDefaultModelChange={onDefaultModelChange}
              onDefaultProviderChange={onDefaultProviderChange}
              onSubmit={handleDefaultsSubmit}
            />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <ProviderCredentialsPanel
            credentials={credentials}
            currentDefaultModel={currentDefaultModel}
            currentDefaultProviderDisplayName={currentDefaultProviderDisplayName}
            currentDefaultProviderId={currentDefaultProviderId}
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

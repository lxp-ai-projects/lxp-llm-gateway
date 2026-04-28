import { Alert, Grid, Stack } from '@mantine/core';

import { ProviderCredentialForm } from '../features/providers/components/provider-credential-form';
import { ProviderCredentialsPanel } from '../features/providers/components/provider-credentials-panel';
import { ProviderDefaultsForm } from '../features/providers/components/provider-defaults-form';
import { useProvidersController } from '../features/providers/hooks/use-providers-controller';
import { PageHeader } from '../components/page-header';

export function ProvidersPage() {
  const {
    apiToken,
    baseUrl,
    beginCredentialEdit,
    credentialValidationError,
    credentials,
    currentDefaultModel,
    currentDefaultProviderDisplayName,
    currentDefaultProviderId,
    currentDefaultImageModel,
    currentDefaultImageProviderDisplayName,
    currentDefaultImageProviderId,
    defaultModel,
    defaultModelOptions,
    defaultProviderId,
    defaultProviderOptions,
    defaultImageModel,
    defaultImageModelOptions,
    defaultImageProviderId,
    defaultImageProviderOptions,
    editingCredentialId,
    handleCredentialSubmit,
    handleDefaultsSubmit,
    isCredentialPending,
    isDefaultsPending,
    isModelLoading,
    isImageModelLoading,
    label,
    imageModelErrorMessage,
    modelErrorMessage,
    onApiTokenChange,
    onBaseUrlChange,
    onDefaultModelChange,
    onDefaultProviderChange,
    onDefaultImageModelChange,
    onDefaultImageProviderChange,
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
        title="Provider Credentials"
        description="Manage your write-only provider credentials and choose separate default provider/model pairs for gateway chat and gateway image generation/editing."
      />
      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            <ProviderCredentialForm
              apiToken={apiToken}
              baseUrl={baseUrl}
              credentialValidationError={credentialValidationError}
              editingCredentialId={editingCredentialId}
              isPending={isCredentialPending}
              label={label}
              onApiTokenChange={onApiTokenChange}
              onBaseUrlChange={onBaseUrlChange}
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
              defaultImageModel={defaultImageModel}
              defaultImageModelOptions={defaultImageModelOptions}
              defaultImageProviderId={defaultImageProviderId}
              defaultImageProviderOptions={defaultImageProviderOptions}
              isDirty={providerSettingsDirty}
              imageModelErrorMessage={imageModelErrorMessage}
              isImageModelLoading={isImageModelLoading}
              isModelLoading={isModelLoading}
              isPending={isDefaultsPending}
              modelErrorMessage={modelErrorMessage}
              onDefaultModelChange={onDefaultModelChange}
              onDefaultProviderChange={onDefaultProviderChange}
              onDefaultImageModelChange={onDefaultImageModelChange}
              onDefaultImageProviderChange={onDefaultImageProviderChange}
              onSubmit={handleDefaultsSubmit}
            />
          </Stack>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 7 }}>
          <ProviderCredentialsPanel
            credentials={credentials}
            currentDefaultModel={currentDefaultModel}
            currentDefaultProviderDisplayName={
              currentDefaultProviderDisplayName
            }
            currentDefaultProviderId={currentDefaultProviderId}
            currentDefaultImageModel={currentDefaultImageModel}
            currentDefaultImageProviderDisplayName={
              currentDefaultImageProviderDisplayName
            }
            currentDefaultImageProviderId={currentDefaultImageProviderId}
            onEditCredential={beginCredentialEdit}
          />
        </Grid.Col>
      </Grid>
      <Alert color="blue" mt="lg" title="Boundary reminder">
        Administrators may create or reset another user provider credential, but
        they should only ever see the masked version of another user secret,
        never the raw token.
      </Alert>
    </>
  );
}

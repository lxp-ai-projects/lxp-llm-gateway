import { Alert, Grid, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { ProviderCredentialForm } from '../features/providers/components/provider-credential-form';
import { ProviderCredentialsPanel } from '../features/providers/components/provider-credentials-panel';
import { ProviderDefaultsForm } from '../features/providers/components/provider-defaults-form';
import { useProvidersController } from '../features/providers/hooks/use-providers-controller';
import { PageHeader } from '../components/page-header';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useSession } from '../lib/use-session';

export function ProvidersPage() {
  const { t } = useTranslation('pages');
  const sessionQuery = useSession();
  const {
    apiToken,
    baseUrl,
    beginCredentialEdit,
    confirmDeleteCredential,
    credentialConflictPrompt,
    credentialDeleteTarget,
    credentialSubmitError,
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
    deleteCredential,
    deleteCredentialError,
    deleteCredentialSuccessMessage,
    editingCredentialId,
    editingCredentialMode,
    handleCredentialSubmit,
    handleDefaultsSubmit,
    handleExistingCredentialEdit,
    handleExistingCredentialReplace,
    isDeleteCredentialPending,
    isCredentialPending,
    isDefaultsPending,
    isModelLoading,
    isImageModelLoading,
    label,
    imageModelErrorMessage,
    modelErrorMessage,
    onApiTokenChange,
    onBaseUrlChange,
    onCancelDeleteCredential,
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
        title={t('providers.title')}
        description={t('providers.description')}
        context={getActiveTenantLabel(sessionQuery.data)}
      />
      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Stack gap="lg">
            <ProviderCredentialForm
              apiToken={apiToken}
              baseUrl={baseUrl}
              credentialConflictPrompt={credentialConflictPrompt}
              credentialSubmitError={credentialSubmitError}
              credentialValidationError={credentialValidationError}
              editingCredentialId={editingCredentialId}
              editingCredentialMode={editingCredentialMode}
              isPending={isCredentialPending}
              label={label}
              onApiTokenChange={onApiTokenChange}
              onBaseUrlChange={onBaseUrlChange}
              onCancelEdit={resetCredentialForm}
              onEditExistingCredential={handleExistingCredentialEdit}
              onLabelChange={onLabelChange}
              onProviderChange={onProviderChange}
              onReplaceExistingCredential={handleExistingCredentialReplace}
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
            credentialDeleteTarget={credentialDeleteTarget}
            currentDefaultImageModel={currentDefaultImageModel}
            currentDefaultImageProviderDisplayName={
              currentDefaultImageProviderDisplayName
            }
            currentDefaultImageProviderId={currentDefaultImageProviderId}
            deleteCredentialError={deleteCredentialError}
            deleteCredentialSuccessMessage={deleteCredentialSuccessMessage}
            isDeleteCredentialPending={isDeleteCredentialPending}
            onCancelDeleteCredential={onCancelDeleteCredential}
            onConfirmDeleteCredential={confirmDeleteCredential}
            onDeleteCredential={deleteCredential}
            onEditCredential={beginCredentialEdit}
          />
        </Grid.Col>
      </Grid>
      <Alert color="blue" mt="lg" title={t('providers.boundaryTitle')}>
        {t('providers.boundaryDescription')}
      </Alert>
    </>
  );
}

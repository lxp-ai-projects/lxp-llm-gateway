import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconHelpCircle, IconKey, IconRestore } from '@tabler/icons-react';

import { getProviderCredentialResponsibilityNote } from '../lib/provider-utils';

function HelpLabel({ label, help }: { label: string; help: string }) {
  const { t } = useTranslation('providers');
  return (
    <Group gap={6} wrap="nowrap">
      <Text component="span" inherit>
        {label}
      </Text>
      <Tooltip label={help} multiline w={280} withArrow>
        <ActionIcon
          aria-label={t('providerCredentialForm.helpFor', { label })}
          color="gray"
          radius="xl"
          size="sm"
          variant="subtle"
        >
          <IconHelpCircle size={16} stroke={1.8} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

type ProviderOption = {
  value: string;
  label: string;
};

type ProviderCredentialFormProps = {
  apiToken: string;
  baseUrl: string;
  credentialConflictPrompt: {
    providerId: string;
    label: string;
    message: string;
  } | null;
  credentialSubmitError: string | null;
  credentialValidationError: string | null;
  editingCredentialId: string | null;
  editingCredentialMode: 'edit' | 'replace';
  isPending: boolean;
  label: string;
  onApiTokenChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onCancelEdit: () => void;
  onEditExistingCredential: () => void;
  onLabelChange: (value: string) => void;
  onProviderChange: (value: string | null) => void;
  onReplaceExistingCredential: () => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  providerId: string;
  providerOptions: ProviderOption[];
};

export function ProviderCredentialForm({
  apiToken,
  baseUrl,
  credentialConflictPrompt,
  credentialSubmitError,
  credentialValidationError,
  editingCredentialId,
  editingCredentialMode,
  isPending,
  label,
  onApiTokenChange,
  onBaseUrlChange,
  onCancelEdit,
  onEditExistingCredential,
  onLabelChange,
  onProviderChange,
  onReplaceExistingCredential,
  onSubmit,
  providerId,
  providerOptions,
}: ProviderCredentialFormProps) {
  const { t } = useTranslation('providers');
  const isEditing = Boolean(editingCredentialId);
  const isReplacingExisting = isEditing && editingCredentialMode === 'replace';
  const usesEndpointAccess = providerId === 'ollama';
  const isGroq = providerId === 'groq';
  const isGoogle = providerId === 'google';
  const responsibilityNote =
    getProviderCredentialResponsibilityNote(providerId);
  const isSubmitDisabled =
    !label.trim() ||
    (!isEditing && !apiToken.trim() && !baseUrl.trim()) ||
    (isReplacingExisting && !apiToken.trim() && !baseUrl.trim());

  return (
    <Card className="section-card">
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={3}>
              {isEditing
                ? isReplacingExisting
                  ? t('providerCredentialForm.replaceProviderCredential')
                  : t('providerCredentialForm.editProviderCredential')
                : t('providerCredentialForm.addProviderCredential')}
            </Title>
            <IconKey size={18} />
          </Group>
          <Text c="dimmed" size="sm">
            {t(
              'providerCredentialForm.credentialValuesRemainWriteOnlyAfterSave',
            )}
          </Text>
          {usesEndpointAccess ? (
            <Alert
              color="blue"
              variant="light"
              title={t('providerCredentialForm.endpointBasedCredential')}
            >
              {t('providerCredentialForm.ollamaCredentialsMayRelyOnALocal')}
            </Alert>
          ) : null}
          {isGroq ? (
            <Alert
              color="blue"
              variant="light"
              title={t('providerCredentialForm.providerIdentityNote')}
            >
              {t('providerCredentialForm.groqIsGroqsInferenceAPINotGrok')}
            </Alert>
          ) : null}
          {responsibilityNote ? (
            <Alert
              color="orange"
              variant="light"
              title={t('providerCredentialForm.billingAndKeyResponsibility')}
            >
              {t(`providerCredentialForm.responsibility.${providerId}`, {
                defaultValue: responsibilityNote,
              })}
            </Alert>
          ) : null}
          {credentialValidationError ? (
            <Alert
              color="red"
              title={t('providerCredentialForm.credentialValidationFailed')}
            >
              {credentialValidationError}
            </Alert>
          ) : null}
          {credentialSubmitError ? (
            <Alert
              color="red"
              title={t('providerCredentialForm.unableToSaveCredential')}
            >
              {credentialSubmitError}
            </Alert>
          ) : null}
          {credentialConflictPrompt ? (
            <Alert
              color="yellow"
              title={t('providerCredentialForm.credentialAlreadyExists')}
            >
              <Stack gap="xs">
                <Text size="sm">
                  {credentialConflictPrompt.message}{' '}
                  {t(
                    'providerCredentialForm.editTheExistingCredentialOrExplicitlyReplace',
                  )}
                </Text>
                <Group gap="xs">
                  <Button
                    onClick={onEditExistingCredential}
                    size="xs"
                    type="button"
                    variant="light"
                  >
                    {t('providerCredentialForm.editExistingCredential')}
                  </Button>
                  <Button
                    onClick={onReplaceExistingCredential}
                    size="xs"
                    type="button"
                    variant="light"
                  >
                    {t('providerCredentialForm.replaceExistingCredential')}
                  </Button>
                </Group>
              </Stack>
            </Alert>
          ) : null}
          {isReplacingExisting ? (
            <Alert
              color="orange"
              title={t('providerCredentialForm.replaceExistingCredential')}
            >
              {t('providerCredentialForm.savingThisFormWillRotateTheStored')}
            </Alert>
          ) : null}
          <label className="form-native-field">
            <Text component="span" size="sm" fw={500}>
              {t('providerCredentialForm.provider')}
            </Text>
            <select
              aria-label={t('providerCredentialForm.provider')}
              className="form-native-select"
              data-testid="providers-provider-select"
              disabled={isEditing}
              onChange={(event) => onProviderChange(event.currentTarget.value)}
              value={providerId}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <TextInput
            data-testid="providers-label-input"
            label={
              <HelpLabel
                label={t('providerCredentialForm.label')}
                help={t('providerCredentialForm.labelHelp')}
              />
            }
            onChange={(event) => onLabelChange(event.currentTarget.value)}
            value={label}
          />
          <PasswordInput
            data-testid="providers-token-input"
            description={
              isEditing
                ? t('providerCredentialForm.keepCurrentToken')
                : undefined
            }
            label={
              <HelpLabel
                label={
                  isEditing
                    ? t('providerCredentialForm.replaceApiToken')
                    : t('providerCredentialForm.apiToken')
                }
                help={t('providerCredentialForm.apiTokenHelp')}
              />
            }
            onChange={(event) => onApiTokenChange(event.currentTarget.value)}
            placeholder={
              isEditing
                ? t('providerCredentialForm.rotateTokenPlaceholder')
                : usesEndpointAccess
                  ? t('providerCredentialForm.ollamaTokenPlaceholder')
                  : isGoogle
                    ? t('providerCredentialForm.requiredForGoogle')
                    : providerId === 'xai'
                      ? t('providerCredentialForm.requiredForXai')
                      : providerId === 'openai'
                        ? t('providerCredentialForm.requiredForOpenai')
                        : providerId === 'anthropic'
                          ? t('providerCredentialForm.requiredForAnthropic')
                          : providerId === 'mistral'
                            ? t('providerCredentialForm.requiredForMistral')
                            : providerId === 'deepseek'
                              ? t('providerCredentialForm.requiredForDeepseek')
                              : undefined
            }
            value={apiToken}
          />
          <TextInput
            data-testid="providers-base-url-input"
            description={
              isEditing
                ? t('providerCredentialForm.keepCurrentEndpoint')
                : usesEndpointAccess
                  ? t('providerCredentialForm.ollamaBaseUrlDescription')
                  : t('providerCredentialForm.baseUrlDescription')
            }
            label={
              <HelpLabel
                label={
                  isEditing
                    ? t('providerCredentialForm.replaceBaseUrl')
                    : t('providerCredentialForm.baseUrl')
                }
                help={t('providerCredentialForm.baseUrlHelp')}
              />
            }
            onChange={(event) => onBaseUrlChange(event.currentTarget.value)}
            placeholder={
              usesEndpointAccess ? 'http://127.0.0.1:11434/v1' : undefined
            }
            value={baseUrl}
          />
          <Group justify="space-between">
            <Group gap="xs">
              {isEditing ? (
                <Button
                  data-testid="providers-cancel-edit"
                  leftSection={<IconRestore size={16} />}
                  onClick={onCancelEdit}
                  type="button"
                  variant="light"
                >
                  {t('providerCredentialForm.cancelEdit')}
                </Button>
              ) : null}
            </Group>
            <Button
              data-testid={
                isEditing
                  ? 'providers-update-credential'
                  : 'providers-save-credential'
              }
              disabled={isSubmitDisabled}
              loading={isPending}
              type="submit"
            >
              {isEditing
                ? t('providerCredentialForm.updateCredential')
                : t('providerCredentialForm.saveCredential')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}

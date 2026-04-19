import {
  Alert,
  Button,
  Card,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconKey, IconRestore } from '@tabler/icons-react';

type ProviderOption = {
  value: string;
  label: string;
};

type ProviderCredentialFormProps = {
  apiToken: string;
  baseUrl: string;
  credentialValidationError: string | null;
  editingCredentialId: string | null;
  isPending: boolean;
  label: string;
  onApiTokenChange: (value: string) => void;
  onBaseUrlChange: (value: string) => void;
  onCancelEdit: () => void;
  onLabelChange: (value: string) => void;
  onProviderChange: (value: string | null) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  providerId: string;
  providerOptions: ProviderOption[];
};

export function ProviderCredentialForm({
  apiToken,
  baseUrl,
  credentialValidationError,
  editingCredentialId,
  isPending,
  label,
  onApiTokenChange,
  onBaseUrlChange,
  onCancelEdit,
  onLabelChange,
  onProviderChange,
  onSubmit,
  providerId,
  providerOptions,
}: ProviderCredentialFormProps) {
  const isEditing = Boolean(editingCredentialId);
  const usesEndpointAccess = providerId === 'ollama';
  const isGroq = providerId === 'groq';
  const isXai = providerId === 'xai';
  const isOpenAi = providerId === 'openai';
  const isAnthropic = providerId === 'anthropic';
  const isSubmitDisabled =
    !label.trim() || (!isEditing && !apiToken.trim() && !baseUrl.trim());

  return (
    <Card className="section-card">
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={3}>
              {isEditing
                ? 'Edit provider credential'
                : 'Add provider credential'}
            </Title>
            <IconKey size={18} />
          </Group>
          <Text c="dimmed" size="sm">
            Credential values remain write-only. After save, only a masked hint
            is shown back to you.
          </Text>
          {usesEndpointAccess ? (
            <Alert color="blue" variant="light" title="Endpoint-based credential">
              Ollama credentials may rely on a local/runtime base URL or the
              Ollama Cloud API on `https://ollama.com`. API tokens are optional
              for local instances and required for Ollama Cloud.
            </Alert>
          ) : null}
          {isGroq ? (
            <Alert color="blue" variant="light" title="Provider identity note">
              Groq is Groq's inference API, not Grok from xAI.
            </Alert>
          ) : null}
          {isXai ? (
            <Alert
              color="orange"
              variant="light"
              title="Billing and key responsibility"
            >
              xAI Grok support is experimental and requires additional
              certification tests before it can be considered stable. Usage is
              billed through your xAI account. Protect this API key, do not
              share it, and only use keys your organization is authorized to
              spend with. LXP is not responsible for authorized or
              unauthorized charges made with this key.
            </Alert>
          ) : null}
          {isOpenAi ? (
            <Alert
              color="orange"
              variant="light"
              title="Billing and key responsibility"
            >
              OpenAI support is experimental and requires additional
              certification tests before it can be considered stable. Usage is
              billed through your OpenAI account. Protect this API key, do not
              share it, and only use keys your organization is authorized to
              spend with. LXP is not responsible for authorized or
              unauthorized charges made with this key.
            </Alert>
          ) : null}
          {isAnthropic ? (
            <Alert
              color="orange"
              variant="light"
              title="Billing and key responsibility"
            >
              Anthropic support is experimental and requires additional
              certification tests before it can be considered stable. Usage is
              billed through your Anthropic account. Protect this API key, do
              not share it, and only use keys your organization is authorized
              to spend with. LXP is not responsible for authorized or
              unauthorized charges made with this key.
            </Alert>
          ) : null}
          {credentialValidationError ? (
            <Alert color="red" title="Credential validation failed">
              {credentialValidationError}
            </Alert>
          ) : null}
          <label className="form-native-field">
            <Text component="span" size="sm" fw={500}>
              Provider
            </Text>
            <select
              aria-label="Provider"
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
            label="Label"
            onChange={(event) => onLabelChange(event.currentTarget.value)}
            value={label}
          />
          <PasswordInput
            data-testid="providers-token-input"
            description={
              isEditing
                ? 'Leave blank to keep the current token and update only the label.'
                : undefined
            }
            label={isEditing ? 'Replace API token' : 'API token'}
            onChange={(event) => onApiTokenChange(event.currentTarget.value)}
            placeholder={
              isEditing
                ? 'Enter a new token only if you want to rotate it'
                : usesEndpointAccess
                  ? 'Optional for local Ollama; required for protected or cloud endpoints'
                : isXai
                  ? 'Required for xAI Grok'
                : isOpenAi
                  ? 'Required for OpenAI'
                : isAnthropic
                  ? 'Required for Anthropic'
                : undefined
            }
            value={apiToken}
          />
          <TextInput
            data-testid="providers-base-url-input"
            description={
              isEditing
                ? 'Leave blank to keep the current endpoint and update only the other fields.'
                : usesEndpointAccess
                  ? 'Use http://127.0.0.1:11434 for local Ollama, or https://ollama.com for Ollama Cloud.'
                  : 'Optional override when this credential should use a non-default provider endpoint.'
            }
            label={isEditing ? 'Replace base URL' : 'Base URL'}
            onChange={(event) => onBaseUrlChange(event.currentTarget.value)}
            placeholder={
              usesEndpointAccess
                ? 'http://127.0.0.1:11434/v1'
                : undefined
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
                  Cancel edit
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
              {isEditing ? 'Update credential' : 'Save credential'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  );
}

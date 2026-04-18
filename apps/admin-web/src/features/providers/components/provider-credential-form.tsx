import {
  Button,
  Card,
  Group,
  PasswordInput,
  Select,
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
  editingCredentialId: string | null;
  isPending: boolean;
  label: string;
  onApiTokenChange: (value: string) => void;
  onCancelEdit: () => void;
  onLabelChange: (value: string) => void;
  onProviderChange: (value: string | null) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  providerId: string;
  providerOptions: ProviderOption[];
};

export function ProviderCredentialForm({
  apiToken,
  editingCredentialId,
  isPending,
  label,
  onApiTokenChange,
  onCancelEdit,
  onLabelChange,
  onProviderChange,
  onSubmit,
  providerId,
  providerOptions,
}: ProviderCredentialFormProps) {
  const isEditing = Boolean(editingCredentialId);
  const isSubmitDisabled = !label.trim() || (!isEditing && !apiToken.trim());

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
            Token values remain write-only. After save, only a masked hint is
            shown back to you.
          </Text>
          <Select
            data={providerOptions}
            data-testid="providers-provider-select"
            disabled={isEditing}
            label="Provider"
            onChange={onProviderChange}
            value={providerId}
          />
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
                : undefined
            }
            value={apiToken}
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

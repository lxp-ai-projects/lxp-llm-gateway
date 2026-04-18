import {
  Alert,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconSettings } from '@tabler/icons-react';

type Option = {
  value: string;
  label: string;
};

type ProviderDefaultsFormProps = {
  defaultModel: string | null;
  defaultModelOptions: Option[];
  defaultProviderId: string | null;
  defaultProviderOptions: Option[];
  isDirty: boolean;
  isModelLoading: boolean;
  isPending: boolean;
  modelErrorMessage: string | null;
  onDefaultModelChange: (value: string | null) => void;
  onDefaultProviderChange: (value: string | null) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

export function ProviderDefaultsForm({
  defaultModel,
  defaultModelOptions,
  defaultProviderId,
  defaultProviderOptions,
  isDirty,
  isModelLoading,
  isPending,
  modelErrorMessage,
  onDefaultModelChange,
  onDefaultProviderChange,
  onSubmit,
}: ProviderDefaultsFormProps) {
  return (
    <Card className="section-card">
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={3}>Gateway defaults</Title>
            <IconSettings size={18} />
          </Group>
          <Text c="dimmed" size="sm">
            These values are used when `/api/v1/chat` is called without an
            explicit `providerId` and `model`.
          </Text>
          <Select
            clearable
            data={defaultProviderOptions}
            data-testid="providers-default-provider"
            label="Default provider"
            onChange={onDefaultProviderChange}
            placeholder={
              defaultProviderOptions.length
                ? 'Choose a provider with an active credential'
                : 'Add a credential first'
            }
            value={defaultProviderId}
          />
          <Select
            clearable
            data={defaultModelOptions}
            data-testid="providers-default-model"
            disabled={
              !defaultProviderId || isModelLoading || Boolean(modelErrorMessage)
            }
            label="Default model"
            onChange={onDefaultModelChange}
            placeholder={
              defaultProviderId
                ? isModelLoading
                  ? 'Loading provider models...'
                  : 'Choose a default model'
                : 'Choose a default provider first'
            }
            value={defaultModel}
          />
          {modelErrorMessage ? (
            <Alert
              color="red"
              icon={<IconAlertCircle size={18} />}
              title="Model loading failed"
            >
              {modelErrorMessage}
            </Alert>
          ) : null}
          <Button
            data-testid="providers-save-defaults"
            disabled={!isDirty}
            loading={isPending}
            type="submit"
          >
            Save defaults
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

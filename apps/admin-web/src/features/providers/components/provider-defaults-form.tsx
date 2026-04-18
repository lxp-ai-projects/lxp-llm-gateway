import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconSettings } from '@tabler/icons-react';

import { getProviderCatalogPricingNote } from '../lib/provider-utils';

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
  const pricingNote = getProviderCatalogPricingNote(defaultProviderId);

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
          <label className="form-native-field">
            <Text component="span" size="sm" fw={500}>
              Default provider
            </Text>
            <select
              aria-label="Default provider"
              className="form-native-select"
              data-testid="providers-default-provider"
              onChange={(event) =>
                onDefaultProviderChange(event.currentTarget.value || null)
              }
              value={defaultProviderId ?? ''}
            >
              <option value="">
                {defaultProviderOptions.length
                  ? 'Choose a provider with an active credential'
                  : 'Add a credential first'}
              </option>
              {defaultProviderOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-native-field">
            <Text component="span" size="sm" fw={500}>
              Default model
            </Text>
            <select
              aria-label="Default model"
              className="form-native-select"
              data-testid="providers-default-model"
              disabled={
                !defaultProviderId || isModelLoading || Boolean(modelErrorMessage)
              }
              onChange={(event) =>
                onDefaultModelChange(event.currentTarget.value || null)
              }
              value={defaultModel ?? ''}
            >
              <option value="">
                {defaultProviderId
                  ? isModelLoading
                    ? 'Loading provider models...'
                    : 'Choose a default model'
                  : 'Choose a default provider first'}
              </option>
              {defaultModelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {modelErrorMessage ? (
            <Alert
              color="red"
              icon={<IconAlertCircle size={18} />}
              title="Model loading failed"
            >
              {modelErrorMessage}
            </Alert>
          ) : null}
          {pricingNote ? (
            <Alert color="blue" title="Model catalog note">
              {pricingNote}
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

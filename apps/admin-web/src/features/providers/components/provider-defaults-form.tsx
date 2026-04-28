import {
  Accordion,
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconSettings } from '@tabler/icons-react';

import {
  getProviderCatalogPricingNote,
  getProviderModelLoadingNote,
} from '../lib/provider-utils';

type Option = {
  value: string;
  label: string;
};

type ProviderDefaultsFormProps = {
  defaultModel: string | null;
  defaultModelOptions: Option[];
  defaultProviderId: string | null;
  defaultProviderOptions: Option[];
  defaultImageModel: string | null;
  defaultImageModelOptions: Option[];
  defaultImageProviderId: string | null;
  defaultImageProviderOptions: Option[];
  isDirty: boolean;
  isModelLoading: boolean;
  isImageModelLoading: boolean;
  isPending: boolean;
  modelErrorMessage: string | null;
  imageModelErrorMessage: string | null;
  onDefaultModelChange: (value: string | null) => void;
  onDefaultProviderChange: (value: string | null) => void;
  onDefaultImageModelChange: (value: string | null) => void;
  onDefaultImageProviderChange: (value: string | null) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

export function ProviderDefaultsForm({
  defaultModel,
  defaultModelOptions,
  defaultProviderId,
  defaultProviderOptions,
  defaultImageModel,
  defaultImageModelOptions,
  defaultImageProviderId,
  defaultImageProviderOptions,
  isDirty,
  isModelLoading,
  isImageModelLoading,
  isPending,
  modelErrorMessage,
  imageModelErrorMessage,
  onDefaultModelChange,
  onDefaultProviderChange,
  onDefaultImageModelChange,
  onDefaultImageProviderChange,
  onSubmit,
}: ProviderDefaultsFormProps) {
  const pricingNote = getProviderCatalogPricingNote(defaultProviderId);
  const modelLoadingNote = getProviderModelLoadingNote(defaultProviderId);
  const imagePricingNote = getProviderCatalogPricingNote(defaultImageProviderId);
  const imageModelLoadingNote = getProviderModelLoadingNote(defaultImageProviderId);

  return (
    <Card className="section-card">
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={3}>Gateway defaults</Title>
            <IconSettings size={18} />
          </Group>
          <Text c="dimmed" size="sm">
            Choose separate fallback provider/model pairs for gateway chat and image generation/editing.
          </Text>
          <Accordion defaultValue={['chat-defaults', 'image-defaults']} multiple variant="separated">
            <Accordion.Item value="chat-defaults">
              <Accordion.Control>Chat</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Text c="dimmed" size="sm">
                    These values are used when `/api/v1/chat` is called without an explicit `providerId` and `model`.
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
                  {modelLoadingNote ? (
                    <Alert color="blue" title="Provider model access note">
                      {modelLoadingNote}
                    </Alert>
                  ) : null}
                  {pricingNote ? (
                    <Alert color="blue" title="Model catalog note">
                      {pricingNote}
                    </Alert>
                  ) : null}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="image-defaults">
              <Accordion.Control>Images gen/edit</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Text c="dimmed" size="sm">
                    These values are used when `/api/v1/images/generations` or `/api/v1/images/edits` is called without an explicit `providerId` and `model`.
                  </Text>
                  <Alert color="blue" title="Image-capable providers only">
                    Anthropic, Groq, and Ollama do not currently expose image generation or image editing through the gateway, so they are intentionally excluded from image defaults.
                  </Alert>
                  <label className="form-native-field">
                    <Text component="span" size="sm" fw={500}>
                      Default image provider
                    </Text>
                    <select
                      aria-label="Default image provider"
                      className="form-native-select"
                      data-testid="providers-default-image-provider"
                      onChange={(event) =>
                        onDefaultImageProviderChange(event.currentTarget.value || null)
                      }
                      value={defaultImageProviderId ?? ''}
                    >
                      <option value="">
                        {defaultImageProviderOptions.length
                          ? 'Choose a provider with an active credential'
                          : 'Add a credential first'}
                      </option>
                      {defaultImageProviderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-native-field">
                    <Text component="span" size="sm" fw={500}>
                      Default image model
                    </Text>
                    <select
                      aria-label="Default image model"
                      className="form-native-select"
                      data-testid="providers-default-image-model"
                      disabled={
                        !defaultImageProviderId ||
                        isImageModelLoading ||
                        Boolean(imageModelErrorMessage)
                      }
                      onChange={(event) =>
                        onDefaultImageModelChange(event.currentTarget.value || null)
                      }
                      value={defaultImageModel ?? ''}
                    >
                      <option value="">
                        {defaultImageProviderId
                          ? isImageModelLoading
                            ? 'Loading provider models...'
                            : 'Choose a default model'
                          : 'Choose a default provider first'}
                      </option>
                      {defaultImageModelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {imageModelErrorMessage ? (
                    <Alert
                      color="red"
                      icon={<IconAlertCircle size={18} />}
                      title="Model loading failed"
                    >
                      {imageModelErrorMessage}
                    </Alert>
                  ) : null}
                  {imageModelLoadingNote ? (
                    <Alert color="blue" title="Provider model access note">
                      {imageModelLoadingNote}
                    </Alert>
                  ) : null}
                  {imagePricingNote ? (
                    <Alert color="blue" title="Model catalog note">
                      {imagePricingNote}
                    </Alert>
                  ) : null}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
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

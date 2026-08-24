import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Accordion,
  Alert,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconHelpCircle,
  IconSettings,
} from '@tabler/icons-react';

import {
  getProviderCatalogPricingNote,
  getProviderModelLoadingNote,
} from '../lib/provider-utils';

function HelpLabel({ label, help }: { label: string; help: string }) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text component="span" inherit>
        {label}
      </Text>
      <Tooltip label={help} multiline w={280} withArrow>
        <ActionIcon
          aria-label={`Help for ${label}`}
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
  const { t } = useTranslation('providers');
  const pricingNote = getProviderCatalogPricingNote(defaultProviderId);
  const modelLoadingNote = getProviderModelLoadingNote(defaultProviderId);
  const imagePricingNote = getProviderCatalogPricingNote(
    defaultImageProviderId,
  );
  const imageModelLoadingNote = getProviderModelLoadingNote(
    defaultImageProviderId,
  );

  return (
    <Card className="section-card">
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={3}>{t('providerDefaultsForm.gatewayDefaults')}</Title>
            <IconSettings size={18} />
          </Group>
          <Text c="dimmed" size="sm">
            {t(
              'providerDefaultsForm.chooseSeparateFallbackProviderModelPairsFor',
            )}
          </Text>
          <Accordion
            defaultValue={['chat-defaults', 'image-defaults']}
            multiple
            variant="separated"
          >
            <Accordion.Item value="chat-defaults">
              <Accordion.Control>
                {t('providerDefaultsForm.chat')}
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Text c="dimmed" size="sm">
                    {t('providerDefaultsForm.theseValuesAreUsedWhenApiV1')}
                  </Text>
                  <label className="form-native-field">
                    <HelpLabel
                      label={t('providerDefaultsForm.defaultProvider')}
                      help={t('providerDefaultsForm.chatProviderHelp')}
                    />
                    <select
                      aria-label={t('providerDefaultsForm.defaultProvider')}
                      className="form-native-select"
                      data-testid="providers-default-provider"
                      onChange={(event) =>
                        onDefaultProviderChange(
                          event.currentTarget.value || null,
                        )
                      }
                      value={defaultProviderId ?? ''}
                    >
                      <option value="">
                        {defaultProviderOptions.length
                          ? t('providerDefaultsForm.chooseActiveProvider')
                          : t('providerDefaultsForm.addCredentialFirst')}
                      </option>
                      {defaultProviderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Select
                    data={defaultModelOptions}
                    data-testid="providers-default-model"
                    disabled={
                      !defaultProviderId ||
                      isModelLoading ||
                      Boolean(modelErrorMessage)
                    }
                    label={
                      <HelpLabel
                        label={t('providerDefaultsForm.defaultModel')}
                        help={t('providerDefaultsForm.chatModelHelp')}
                      />
                    }
                    limit={100}
                    nothingFoundMessage={t(
                      'providerDefaultsForm.noModelsFound',
                    )}
                    onChange={onDefaultModelChange}
                    placeholder={
                      defaultProviderId
                        ? isModelLoading
                          ? t('providerDefaultsForm.loadingModels')
                          : t('providerDefaultsForm.chooseDefaultModel')
                        : t('providerDefaultsForm.chooseProviderFirst')
                    }
                    searchable
                    selectFirstOptionOnChange
                    value={defaultModel}
                  />
                  {modelErrorMessage ? (
                    <Alert
                      color="red"
                      icon={<IconAlertCircle size={18} />}
                      title={t('providerDefaultsForm.modelLoadingFailed')}
                    >
                      {modelErrorMessage}
                    </Alert>
                  ) : null}
                  {modelLoadingNote ? (
                    <Alert
                      color="blue"
                      title={t('providerDefaultsForm.providerModelAccessNote')}
                    >
                      {modelLoadingNote}
                    </Alert>
                  ) : null}
                  {pricingNote ? (
                    <Alert
                      color="blue"
                      title={t('providerDefaultsForm.modelCatalogNote')}
                    >
                      {pricingNote}
                    </Alert>
                  ) : null}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="image-defaults">
              <Accordion.Control>
                {t('providerDefaultsForm.imagesGenEdit')}
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  <Text c="dimmed" size="sm">
                    {t('providerDefaultsForm.theseValuesAreUsedWhenApiV12')}
                  </Text>
                  <Alert
                    color="blue"
                    title={t('providerDefaultsForm.imageCapableProvidersOnly')}
                  >
                    {t(
                      'providerDefaultsForm.anthropicGroqAndOllamaDoNotCurrently',
                    )}
                  </Alert>
                  <label className="form-native-field">
                    <HelpLabel
                      label={t('providerDefaultsForm.defaultImageProvider')}
                      help={t('providerDefaultsForm.imageProviderHelp')}
                    />
                    <select
                      aria-label={t(
                        'providerDefaultsForm.defaultImageProvider',
                      )}
                      className="form-native-select"
                      data-testid="providers-default-image-provider"
                      onChange={(event) =>
                        onDefaultImageProviderChange(
                          event.currentTarget.value || null,
                        )
                      }
                      value={defaultImageProviderId ?? ''}
                    >
                      <option value="">
                        {defaultImageProviderOptions.length
                          ? t('providerDefaultsForm.chooseActiveProvider')
                          : t('providerDefaultsForm.addCredentialFirst')}
                      </option>
                      {defaultImageProviderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Select
                    data={defaultImageModelOptions}
                    data-testid="providers-default-image-model"
                    disabled={
                      !defaultImageProviderId ||
                      isImageModelLoading ||
                      Boolean(imageModelErrorMessage)
                    }
                    label={
                      <HelpLabel
                        label={t('providerDefaultsForm.defaultImageModel')}
                        help={t('providerDefaultsForm.imageModelHelp')}
                      />
                    }
                    limit={100}
                    nothingFoundMessage={t(
                      'providerDefaultsForm.noModelsFound',
                    )}
                    onChange={onDefaultImageModelChange}
                    placeholder={
                      defaultImageProviderId
                        ? isImageModelLoading
                          ? t('providerDefaultsForm.loadingModels')
                          : t('providerDefaultsForm.chooseDefaultModel')
                        : t('providerDefaultsForm.chooseProviderFirst')
                    }
                    searchable
                    selectFirstOptionOnChange
                    value={defaultImageModel}
                  />
                  {imageModelErrorMessage ? (
                    <Alert
                      color="red"
                      icon={<IconAlertCircle size={18} />}
                      title={t('providerDefaultsForm.modelLoadingFailed')}
                    >
                      {imageModelErrorMessage}
                    </Alert>
                  ) : null}
                  {imageModelLoadingNote ? (
                    <Alert
                      color="blue"
                      title={t('providerDefaultsForm.providerModelAccessNote')}
                    >
                      {imageModelLoadingNote}
                    </Alert>
                  ) : null}
                  {imagePricingNote ? (
                    <Alert
                      color="blue"
                      title={t('providerDefaultsForm.modelCatalogNote')}
                    >
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
            {t('providerDefaultsForm.saveDefaults')}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

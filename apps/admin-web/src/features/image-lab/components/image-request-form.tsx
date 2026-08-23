import { useTranslation } from 'react-i18next';
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Image,
  LoadingOverlay,
  Modal,
  NumberInput,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { formatDateTime } from '../../../i18n/format';
import {
  IconCheck,
  IconChecks,
  IconLibraryPhoto,
  IconRotateClockwise2,
  IconPencil,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

import type {
  ImageAspectRatioOption,
  ImageInputFidelityOption,
  ImageModerationOption,
  ProviderModelSummary,
} from '../../../lib/api-client.types';
import type { ReturnTypeUseImageLab } from '../use-image-lab.types';

export function ImageRequestForm({
  imageLab,
}: {
  imageLab: ReturnTypeUseImageLab;
}) {
  const { t } = useTranslation('image');
  const REFERENCE_CATALOG_PAGE_SIZE = 6;
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<
    string | null
  >(null);
  const [referenceCatalogOpened, setReferenceCatalogOpened] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetSort, setAssetSort] = useState<'newest' | 'oldest' | 'label'>(
    'newest',
  );
  const [assetFilter, setAssetFilter] = useState<
    'all' | 'available' | 'selected'
  >('all');
  const [referenceCatalogPage, setReferenceCatalogPage] = useState(1);
  const [showProviderLoadingOverlay, setShowProviderLoadingOverlay] =
    useState(false);
  const isSmallViewport = useMediaQuery('(max-width: 48em)');
  const capabilities = imageLab.selectedCapabilities;
  const aspectRatios = capabilities?.supportedImageAspectRatios ?? [];
  const responseFormats = capabilities?.supportedImageResponseFormats ?? [];
  const resolutions = capabilities?.supportedImageResolutions ?? [];
  const backgrounds = capabilities?.supportedImageBackgrounds ?? [];
  const qualities = capabilities?.supportedImageQualities ?? [];
  const moderations = capabilities?.supportedImageModerations ?? [];
  const outputFormats = capabilities?.supportedImageOutputFormats ?? [];
  const inputFidelities = capabilities?.supportedImageInputFidelities ?? [];
  const outputCompressionRange = capabilities?.imageOutputCompressionRange;
  const maxGeneratedImagesPerRequest =
    capabilities?.maxGeneratedImagesPerRequest ?? 1;
  const normalizedModelId =
    imageLab.selectedModel?.id.trim().toLowerCase() ?? '';
  const isOpenAiAlignedGptImageModel =
    normalizedModelId.startsWith('gpt') ||
    normalizedModelId.startsWith('openai/gpt') ||
    normalizedModelId === 'chatgpt-image-latest';
  const isOpenAiAlignedProvider =
    imageLab.selectedProvider?.providerId === 'openai' ||
    imageLab.selectedProvider?.providerId === 'nanogpt' ||
    imageLab.selectedProvider?.providerId === 'openrouter';
  const showGptImageModerationControl =
    isOpenAiAlignedProvider &&
    isOpenAiAlignedGptImageModel &&
    moderations.length > 0;
  const showNanoGptOpenAiAlignedNotice =
    imageLab.selectedProvider?.providerId === 'nanogpt' &&
    isOpenAiAlignedGptImageModel;
  const selectedReferenceCount = imageLab.references.length;
  const selectedReferencesLabel =
    selectedReferenceCount === 1
      ? `Selected reference (${selectedReferenceCount})`
      : `Selected references (${selectedReferenceCount})`;
  const filteredReferenceAssets = imageLab.referenceAssets
    .filter((asset) => {
      const normalizedSearch = assetSearch.trim().toLowerCase();
      if (
        normalizedSearch &&
        !(asset.label ?? 'Gateway image asset')
          .toLowerCase()
          .includes(normalizedSearch)
      ) {
        return false;
      }

      const alreadySelected = imageLab.references.some(
        (reference) =>
          reference.kind === 'asset' && reference.assetId === asset.id,
      );

      if (assetFilter === 'available') {
        return !alreadySelected;
      }

      if (assetFilter === 'selected') {
        return alreadySelected;
      }

      return true;
    })
    .sort((left, right) => {
      if (assetSort === 'label') {
        return (left.label ?? '').localeCompare(right.label ?? '');
      }

      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return assetSort === 'oldest'
        ? leftTime - rightTime
        : rightTime - leftTime;
    });
  const referenceCatalogTotalPages = Math.max(
    1,
    Math.ceil(filteredReferenceAssets.length / REFERENCE_CATALOG_PAGE_SIZE),
  );
  const paginatedReferenceAssets = filteredReferenceAssets.slice(
    (referenceCatalogPage - 1) * REFERENCE_CATALOG_PAGE_SIZE,
    referenceCatalogPage * REFERENCE_CATALOG_PAGE_SIZE,
  );
  const referenceLimitReached =
    imageLab.references.length >= imageLab.maxReferenceImages;

  useEffect(() => {
    if (!imageLab.catalogQuery.isPending) {
      setShowProviderLoadingOverlay(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowProviderLoadingOverlay(true);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [imageLab.catalogQuery.isPending]);

  function openReferenceCatalog() {
    setReferenceCatalogOpened(true);
  }

  function closeReferenceCatalog() {
    setReferenceCatalogOpened(false);
  }

  return (
    <>
      <Modal
        centered
        fullScreen={isSmallViewport}
        onClose={closeReferenceCatalog}
        opened={referenceCatalogOpened}
        size={isSmallViewport ? '100%' : 'calc(100vw - 10rem)'}
        title={t('imageRequestForm.uploadedReferenceCatalog')}
      >
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap">
            <Text c="dimmed" size="sm">
              {t(
                'imageRequestForm.reuseUploadedReferencesWithoutUploadingAgain',
              )}
            </Text>
            <Badge
              color={referenceLimitReached ? 'orange' : 'teal'}
              variant="light"
            >
              {imageLab.references.length} / {imageLab.maxReferenceImages}{' '}
              {t('imageRequestForm.selected')}
            </Badge>
          </Group>

          {referenceLimitReached ? (
            <Alert
              color="orange"
              title={t('imageRequestForm.referenceLimitReached')}
            >
              {t('imageRequestForm.referenceLimitDescription', {
                count: imageLab.maxReferenceImages,
              })}
            </Alert>
          ) : null}

          <Group grow align="end">
            <TextInput
              data-testid="reference-catalog-search"
              label={t('imageRequestForm.search')}
              onChange={(event) => {
                setAssetSearch(event.currentTarget.value);
                setReferenceCatalogPage(1);
              }}
              placeholder={t('imageRequestForm.searchByLabel')}
              value={assetSearch}
            />
            <Select
              data={[
                { value: 'newest', label: 'Newest' },
                { value: 'oldest', label: 'Oldest' },
                { value: 'label', label: 'Label' },
              ]}
              data-testid="reference-catalog-sort"
              label={t('imageRequestForm.sort')}
              onChange={(value) => {
                setAssetSort(
                  (value as 'newest' | 'oldest' | 'label') ?? 'newest',
                );
                setReferenceCatalogPage(1);
              }}
              value={assetSort}
            />
            <Select
              data={[
                { value: 'all', label: 'All' },
                { value: 'available', label: 'Available' },
                { value: 'selected', label: 'Selected' },
              ]}
              data-testid="reference-catalog-filter"
              label={t('imageRequestForm.filter')}
              onChange={(value) => {
                setAssetFilter(
                  (value as 'all' | 'available' | 'selected') ?? 'all',
                );
                setReferenceCatalogPage(1);
              }}
              value={assetFilter}
            />
          </Group>

          {paginatedReferenceAssets.length ? (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
              {paginatedReferenceAssets.map((asset) => {
                const alreadySelected = imageLab.references.some(
                  (reference) =>
                    reference.kind === 'asset' &&
                    reference.assetId === asset.id,
                );

                return (
                  <Card key={asset.id} padding="sm" radius="md" withBorder>
                    <Stack gap="xs">
                      <Image
                        alt={asset.label ?? 'Uploaded reference asset'}
                        h={120}
                        radius="md"
                        src={imageLab.mediaUrl(asset.contentUrl)}
                      />
                      <Text lineClamp={2} size="sm">
                        {asset.label ?? 'Gateway image asset'}
                      </Text>
                      <Text c="dimmed" size="xs">
                        {formatDateTime(asset.createdAt)}
                      </Text>
                      <Group gap="xs">
                        <Badge color="gray" size="sm" variant="light">
                          {t('imageRequestForm.upload')}
                        </Badge>
                        <Badge
                          color={alreadySelected ? 'teal' : 'blue'}
                          leftSection={
                            alreadySelected ? (
                              <IconChecks size={12} />
                            ) : (
                              <IconRotateClockwise2 size={12} />
                            )
                          }
                          size="sm"
                          variant="light"
                        >
                          {alreadySelected ? 'Selected' : 'Available'}
                        </Badge>
                      </Group>
                      <TextInput
                        data-testid={`reference-catalog-label-${asset.id}`}
                        label={t('imageRequestForm.label')}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value;
                          setRenameDrafts((current) => ({
                            ...current,
                            [asset.id]: nextValue,
                          }));
                        }}
                        value={renameDrafts[asset.id] ?? asset.label ?? ''}
                      />
                      <Group justify="flex-end" wrap="nowrap">
                        <Tooltip
                          label={
                            alreadySelected
                              ? 'Already selected'
                              : 'Use as reference'
                          }
                        >
                          <ActionIcon
                            aria-label={
                              alreadySelected ? 'Selected' : 'Use as reference'
                            }
                            data-testid={`reference-catalog-use-${asset.id}`}
                            disabled={alreadySelected || referenceLimitReached}
                            onClick={() => imageLab.addReferenceAsset(asset)}
                            variant="light"
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label={t('imageRequestForm.renameReference')}>
                          <ActionIcon
                            aria-label={t('imageRequestForm.renameReference')}
                            data-testid={`reference-catalog-rename-${asset.id}`}
                            disabled={
                              (
                                renameDrafts[asset.id] ??
                                asset.label ??
                                ''
                              ).trim().length === 0 ||
                              (
                                renameDrafts[asset.id] ??
                                asset.label ??
                                ''
                              ).trim() === (asset.label ?? '')
                            }
                            loading={
                              imageLab.updateAssetMutation.isPending &&
                              imageLab.updateAssetMutation.variables
                                ?.assetId === asset.id
                            }
                            onClick={() =>
                              imageLab.renameReferenceAsset(
                                asset.id,
                                renameDrafts[asset.id] ?? asset.label ?? '',
                              )
                            }
                            variant="default"
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        </Tooltip>
                        {pendingDeleteAssetId === asset.id ? (
                          <>
                            <Tooltip
                              label={t('imageRequestForm.confirmDelete')}
                            >
                              <ActionIcon
                                aria-label={t(
                                  'imageRequestForm.confirmDeleteReference',
                                )}
                                color="red"
                                data-testid={`reference-catalog-confirm-delete-${asset.id}`}
                                loading={
                                  imageLab.deleteAssetMutation.isPending &&
                                  imageLab.deleteAssetMutation.variables ===
                                    asset.id
                                }
                                onClick={async () => {
                                  await imageLab.deleteReferenceAsset(asset.id);
                                  setPendingDeleteAssetId(null);
                                }}
                                variant="filled"
                              >
                                <IconCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t('imageRequestForm.cancelDelete')}>
                              <ActionIcon
                                aria-label={t(
                                  'imageRequestForm.cancelDeleteReference',
                                )}
                                data-testid={`reference-catalog-cancel-delete-${asset.id}`}
                                onClick={() => setPendingDeleteAssetId(null)}
                                variant="default"
                              >
                                <IconX size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip
                            label={t('imageRequestForm.deleteReference')}
                          >
                            <ActionIcon
                              aria-label={t('imageRequestForm.deleteReference')}
                              color="red"
                              data-testid={`reference-catalog-delete-${asset.id}`}
                              onClick={() => setPendingDeleteAssetId(asset.id)}
                              variant="subtle"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          ) : (
            <Text c="dimmed" size="sm">
              {t('imageRequestForm.noUploadedReferencesMatchTheCurrentFilters')}
            </Text>
          )}

          <Group justify="space-between" wrap="wrap">
            <Text c="dimmed" size="sm">
              {t('imageRequestForm.page')}
              {referenceCatalogPage} / {referenceCatalogTotalPages}
            </Text>
            <Pagination
              onChange={setReferenceCatalogPage}
              total={referenceCatalogTotalPages}
              value={referenceCatalogPage}
            />
            <Button onClick={closeReferenceCatalog} variant="default">
              {t('imageRequestForm.close')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Card className="section-card image-request-form">
        <Stack gap="md">
          <Title order={3}>{t('imageRequestForm.imageRequest')}</Title>

          <div
            data-testid="image-provider-loading-shell"
            style={{ position: 'relative' }}
          >
            <LoadingOverlay visible={showProviderLoadingOverlay} zIndex={2} />
            <Stack gap="md">
              <Select
                data={imageLab.providers.map((provider) => ({
                  value: provider.providerId,
                  label: provider.displayName,
                }))}
                data-testid="image-provider-select"
                label={t('imageRequestForm.provider')}
                onChange={(value) => {
                  imageLab.setProviderId(value ?? '');
                  imageLab.setModelId('');
                  imageLab.setPrompt('');
                }}
                value={imageLab.providerId}
              />

              <Select
                data={imageLab.models.map((model: ProviderModelSummary) => ({
                  value: model.id,
                  label: model.displayName,
                }))}
                data-testid="image-model-select"
                label={t('imageRequestForm.model')}
                limit={100}
                nothingFoundMessage="No models found"
                onChange={(value) => imageLab.setModelId(value ?? '')}
                searchable
                selectFirstOptionOnChange
                value={imageLab.modelId}
              />
            </Stack>
          </div>

          {imageLab.hasNanoGptPaidModels ? (
            <Checkbox
              checked={imageLab.showNanoGptPaidModels}
              data-testid="nanogpt-paid-models-toggle"
              label={t('imageRequestForm.showNanoGPTPaidOnlyModels')}
              onChange={(event) =>
                imageLab.setShowNanoGptPaidModels(event.currentTarget.checked)
              }
            />
          ) : null}

          <Accordion
            chevronPosition="right"
            defaultValue="prompt-and-options"
            variant="separated"
          >
            <Accordion.Item value="prompt-and-options">
              <Accordion.Control data-testid="prompt-options-accordion">
                {t('imageRequestForm.promptAndOptions')}
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Textarea
                    autosize
                    data-testid="image-prompt-input"
                    label={t('imageRequestForm.prompt')}
                    minRows={5}
                    onChange={(event) =>
                      imageLab.setPrompt(event.currentTarget.value)
                    }
                    value={imageLab.prompt}
                  />

                  <Group grow align="start">
                    {aspectRatios.length ? (
                      <Select
                        data={aspectRatios.map((option) => ({
                          value: (option as ImageAspectRatioOption).value,
                          label: (option as ImageAspectRatioOption).label,
                        }))}
                        data-testid="image-aspect-ratio-select"
                        label={t('imageRequestForm.aspectRatio')}
                        onChange={(value) =>
                          imageLab.setAspectRatio(value ?? '')
                        }
                        value={imageLab.aspectRatio}
                      />
                    ) : null}
                    {responseFormats.length ? (
                      <Select
                        data={responseFormats.map(
                          (format: 'url' | 'b64_json') => ({
                            value: format,
                            label:
                              format === 'b64_json' ? 'Base64' : 'Hosted URL',
                          }),
                        )}
                        data-testid="image-response-format-select"
                        label={t('imageRequestForm.responseFormat')}
                        onChange={(value) =>
                          imageLab.setResponseFormat(
                            (value as 'url' | 'b64_json') ?? 'b64_json',
                          )
                        }
                        value={imageLab.responseFormat}
                      />
                    ) : null}
                    <Select
                      data={buildImageCountOptions(
                        maxGeneratedImagesPerRequest,
                      )}
                      data-testid="image-count-select"
                      label={t('imageRequestForm.count')}
                      onChange={(value) => imageLab.setImageCount(value ?? '1')}
                      value={imageLab.imageCount}
                    />
                  </Group>

                  <Group grow align="start">
                    {resolutions.length ? (
                      <Select
                        data={resolutions}
                        data-testid="image-resolution-select"
                        label={t('imageRequestForm.resolution')}
                        onChange={(value) =>
                          imageLab.setResolution(value ?? '')
                        }
                        value={imageLab.resolution}
                      />
                    ) : null}
                    {backgrounds.length ? (
                      <Select
                        data={backgrounds}
                        data-testid="image-background-select"
                        label={t('imageRequestForm.background')}
                        onChange={(value) =>
                          imageLab.setBackground(value ?? '')
                        }
                        value={imageLab.background}
                      />
                    ) : null}
                    {qualities.length ? (
                      <Select
                        data={qualities}
                        data-testid="image-quality-select"
                        label={t('imageRequestForm.quality')}
                        onChange={(value) => imageLab.setQuality(value ?? '')}
                        value={imageLab.quality}
                      />
                    ) : null}
                    {showGptImageModerationControl ? (
                      <Select
                        data={moderations.map((option) => ({
                          value: (option as ImageModerationOption).value,
                          label: (option as ImageModerationOption).label,
                        }))}
                        data-testid="image-moderation-select"
                        label={t('imageRequestForm.moderation')}
                        onChange={(value) =>
                          imageLab.setModeration(value ?? '')
                        }
                        value={imageLab.moderation}
                      />
                    ) : null}
                  </Group>

                  <Group grow align="start">
                    {outputFormats.length ? (
                      <Select
                        data={outputFormats}
                        data-testid="image-output-format-select"
                        label={t('imageRequestForm.outputFormat')}
                        onChange={(value) =>
                          imageLab.setOutputFormat(value ?? '')
                        }
                        value={imageLab.outputFormat}
                      />
                    ) : null}
                    {outputCompressionRange ? (
                      <NumberInput
                        data-testid="image-output-compression-input"
                        label={t('imageRequestForm.compression')}
                        min={outputCompressionRange.min}
                        max={outputCompressionRange.max}
                        step={outputCompressionRange.step ?? 1}
                        onChange={(value) =>
                          imageLab.setOutputCompression(
                            typeof value === 'number' ? value : '',
                          )
                        }
                        value={imageLab.outputCompression}
                      />
                    ) : null}
                    {imageLab.references.length > 0 &&
                    inputFidelities.length ? (
                      <Select
                        data={inputFidelities.map((option) => ({
                          value: (option as ImageInputFidelityOption).value,
                          label: (option as ImageInputFidelityOption).label,
                        }))}
                        data-testid="image-input-fidelity-select"
                        label={t('imageRequestForm.inputFidelity')}
                        onChange={(value) =>
                          imageLab.setInputFidelity(value ?? '')
                        }
                        value={imageLab.inputFidelity}
                      />
                    ) : null}
                  </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Alert color="blue" title={t('imageRequestForm.referenceAssets')}>
            {t('imageRequestForm.uploadThroughTheGatewayPasteAPublic')}
          </Alert>

          {!imageLab.supportsImageEditing ? (
            <Alert
              color="yellow"
              title={t('imageRequestForm.editingUnavailable')}
            >
              {t('imageRequestForm.thisModelCurrentlySupportsGenerationOnly')}
            </Alert>
          ) : null}

          {showNanoGptOpenAiAlignedNotice ? (
            <Alert
              color="blue"
              title={t('imageRequestForm.openaiAlignedGPTImageOptions')}
            >
              {t('imageRequestForm.thisNanoGPTModelFollowsTheOpenAIGPT')}
            </Alert>
          ) : null}

          {showGptImageModerationControl ? (
            <Alert color="blue" title={t('imageRequestForm.openaiModeration')}>
              {t('imageRequestForm.choosing')}
              <strong>{t('imageRequestForm.low')}</strong>{' '}
              {t('imageRequestForm.makesFilteringLessRestrictiveButItDoes')}
            </Alert>
          ) : null}

          <Group align="end">
            <TextInput
              className="image-reference-url"
              data-testid="image-reference-url-input"
              label={t('imageRequestForm.referenceImageURL')}
              onChange={(event) =>
                imageLab.setReferenceUrl(event.currentTarget.value)
              }
              placeholder={t('imageRequestForm.httpsExampleComSourcePng')}
              value={imageLab.referenceUrl}
            />
            <Button
              data-testid="image-add-reference-url"
              disabled={
                imageLab.references.length >= imageLab.maxReferenceImages
              }
              onClick={imageLab.addReferenceUrl}
              variant="light"
            >
              {t('imageRequestForm.addURL')}
            </Button>
          </Group>

          <Group>
            <Button
              component="label"
              data-testid="image-upload-reference"
              disabled={
                imageLab.references.length >= imageLab.maxReferenceImages
              }
              htmlFor="image-reference-upload-input"
              leftSection={<IconUpload size={16} />}
              variant="light"
            >
              {t('imageRequestForm.uploadImage')}
            </Button>
            <Text c="dimmed" size="sm">
              {t(
                'imageRequestForm.uploadedFilesBecomeGatewayManagedReferenceAssets',
              )}
            </Text>
          </Group>

          <Accordion
            chevronPosition="right"
            defaultValue={null}
            variant="separated"
          >
            <Accordion.Item value="selected-references">
              <Accordion.Control data-testid="selected-references-accordion">
                {selectedReferencesLabel}
              </Accordion.Control>
              <Accordion.Panel>
                {imageLab.references.length ? (
                  <Stack gap="xs">
                    {imageLab.references.map((reference) => (
                      <Card
                        key={reference.id}
                        padding="sm"
                        radius="md"
                        withBorder
                      >
                        <Group
                          align="flex-start"
                          justify="space-between"
                          wrap="nowrap"
                        >
                          <Group align="flex-start" wrap="nowrap">
                            <Image
                              alt={reference.label}
                              h={72}
                              radius="md"
                              src={reference.previewUrl}
                              w={72}
                            />
                            <Stack gap={4}>
                              <Text lineClamp={2} size="sm">
                                {reference.label}
                              </Text>
                              <Badge size="sm" variant="light">
                                {reference.kind === 'asset'
                                  ? reference.sourceType
                                  : 'url'}
                              </Badge>
                            </Stack>
                          </Group>
                          <Button
                            aria-label={`Remove ${reference.label}`}
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() =>
                              imageLab.removeReference(reference.id)
                            }
                            size="xs"
                            variant="subtle"
                          >
                            {t('imageRequestForm.remove')}
                          </Button>
                        </Group>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('imageRequestForm.noReferencesSelectedYet')}
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Stack gap="xs">
            <Group justify="space-between" wrap="wrap">
              <div>
                <Text fw={600} size="sm">
                  {t('imageRequestForm.uploadedReferenceCatalog')}
                </Text>
                <Text c="dimmed" size="xs">
                  {t('imageRequestForm.reuseWithoutUploadingAgain')}
                </Text>
              </div>
              <Group gap="xs">
                <Badge
                  color={referenceLimitReached ? 'orange' : 'teal'}
                  variant="light"
                >
                  {imageLab.references.length} / {imageLab.maxReferenceImages}{' '}
                  {t('imageRequestForm.selected')}
                </Badge>
                <Button
                  data-testid="reference-catalog-open"
                  leftSection={<IconLibraryPhoto size={16} />}
                  onClick={openReferenceCatalog}
                  variant="light"
                >
                  {t('imageRequestForm.browseCatalog')}
                </Button>
              </Group>
            </Group>

            {referenceLimitReached ? (
              <Alert
                color="orange"
                title={t('imageRequestForm.referenceLimitReached')}
              >
                {t('imageRequestForm.referenceLimitDescription', {
                  count: imageLab.maxReferenceImages,
                })}
              </Alert>
            ) : (
              <Text c="dimmed" size="sm">
                {t('imageRequestForm.openTheCatalogToSearchFilterRename')}
              </Text>
            )}
          </Stack>

          {imageLab.requestError ? (
            <Alert color="red" title={t('imageRequestForm.imageRequestFailed')}>
              {imageLab.requestError}
            </Alert>
          ) : null}

          <Button
            data-testid="image-submit"
            leftSection={<IconSparkles size={16} />}
            loading={imageLab.generateMutation.isPending}
            onClick={() => imageLab.generateMutation.mutate()}
          >
            {imageLab.canEdit ? 'Edit image' : 'Generate image'}
          </Button>
        </Stack>
      </Card>
    </>
  );
}

function buildImageCountOptions(maxGeneratedImagesPerRequest: number) {
  return Array.from(
    { length: Math.max(1, Math.min(maxGeneratedImagesPerRequest, 10)) },
    (_, index) => {
      const value = String(index + 1);
      return {
        value,
        label: index === 0 ? '1 image' : `${value} images`,
      };
    },
  );
}

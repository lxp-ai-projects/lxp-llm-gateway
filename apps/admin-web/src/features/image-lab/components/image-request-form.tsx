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
  const REFERENCE_CATALOG_PAGE_SIZE = 6;
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<string | null>(
    null,
  );
  const [referenceCatalogOpened, setReferenceCatalogOpened] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetSort, setAssetSort] = useState<'newest' | 'oldest' | 'label'>('newest');
  const [assetFilter, setAssetFilter] = useState<'all' | 'available' | 'selected'>(
    'all',
  );
  const [referenceCatalogPage, setReferenceCatalogPage] = useState(1);
  const [showCatalogLoadingOverlay, setShowCatalogLoadingOverlay] = useState(false);
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
  const maxGeneratedImagesPerRequest = capabilities?.maxGeneratedImagesPerRequest ?? 1;
  const normalizedModelId = imageLab.selectedModel?.id.trim().toLowerCase() ?? '';
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
        !(asset.label ?? 'Gateway image asset').toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      const alreadySelected = imageLab.references.some(
        (reference) => reference.kind === 'asset' && reference.assetId === asset.id,
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
      return assetSort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
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
      setShowCatalogLoadingOverlay(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowCatalogLoadingOverlay(true);
    }, 250);

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
        title="Uploaded reference catalog"
      >
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap">
            <Text c="dimmed" size="sm">
              Reuse uploaded references without uploading again.
            </Text>
            <Badge color={referenceLimitReached ? 'orange' : 'teal'} variant="light">
              {imageLab.references.length} / {imageLab.maxReferenceImages} selected
            </Badge>
          </Group>

          {referenceLimitReached ? (
            <Alert color="orange" title="Reference limit reached">
              This model supports up to {imageLab.maxReferenceImages} reference
              {imageLab.maxReferenceImages > 1 ? 's' : ''}. Remove one before adding more.
            </Alert>
          ) : null}

          <Group grow align="end">
            <TextInput
              data-testid="reference-catalog-search"
              label="Search"
              onChange={(event) => {
                setAssetSearch(event.currentTarget.value);
                setReferenceCatalogPage(1);
              }}
              placeholder="Search by label"
              value={assetSearch}
            />
            <Select
              data={[
                { value: 'newest', label: 'Newest' },
                { value: 'oldest', label: 'Oldest' },
                { value: 'label', label: 'Label' },
              ]}
              data-testid="reference-catalog-sort"
              label="Sort"
              onChange={(value) => {
                setAssetSort((value as 'newest' | 'oldest' | 'label') ?? 'newest');
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
              label="Filter"
              onChange={(value) => {
                setAssetFilter((value as 'all' | 'available' | 'selected') ?? 'all');
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
                    reference.kind === 'asset' && reference.assetId === asset.id,
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
                        {new Date(asset.createdAt).toLocaleString()}
                      </Text>
                      <Group gap="xs">
                        <Badge color="gray" size="sm" variant="light">
                          upload
                        </Badge>
                        <Badge
                          color={alreadySelected ? 'teal' : 'blue'}
                          leftSection={
                            alreadySelected ? <IconChecks size={12} /> : <IconRotateClockwise2 size={12} />
                          }
                          size="sm"
                          variant="light"
                        >
                          {alreadySelected ? 'Selected' : 'Available'}
                        </Badge>
                      </Group>
                      <TextInput
                        data-testid={`reference-catalog-label-${asset.id}`}
                        label="Label"
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
                        <Tooltip label={alreadySelected ? 'Already selected' : 'Use as reference'}>
                          <ActionIcon
                            aria-label={alreadySelected ? 'Selected' : 'Use as reference'}
                            data-testid={`reference-catalog-use-${asset.id}`}
                            disabled={alreadySelected || referenceLimitReached}
                            onClick={() => imageLab.addReferenceAsset(asset)}
                            variant="light"
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Rename reference">
                          <ActionIcon
                            aria-label="Rename reference"
                            data-testid={`reference-catalog-rename-${asset.id}`}
                            disabled={
                              (renameDrafts[asset.id] ?? asset.label ?? '').trim().length === 0 ||
                              (renameDrafts[asset.id] ?? asset.label ?? '').trim() ===
                                (asset.label ?? '')
                            }
                            loading={
                              imageLab.updateAssetMutation.isPending &&
                              imageLab.updateAssetMutation.variables?.assetId === asset.id
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
                            <Tooltip label="Confirm delete">
                              <ActionIcon
                                aria-label="Confirm delete reference"
                                color="red"
                                data-testid={`reference-catalog-confirm-delete-${asset.id}`}
                                loading={
                                  imageLab.deleteAssetMutation.isPending &&
                                  imageLab.deleteAssetMutation.variables === asset.id
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
                            <Tooltip label="Cancel delete">
                              <ActionIcon
                                aria-label="Cancel delete reference"
                                data-testid={`reference-catalog-cancel-delete-${asset.id}`}
                                onClick={() => setPendingDeleteAssetId(null)}
                                variant="default"
                              >
                                <IconX size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        ) : (
                          <Tooltip label="Delete reference">
                            <ActionIcon
                              aria-label="Delete reference"
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
              No uploaded references match the current filters.
            </Text>
          )}

          <Group justify="space-between" wrap="wrap">
            <Text c="dimmed" size="sm">
              Page {referenceCatalogPage} / {referenceCatalogTotalPages}
            </Text>
            <Pagination
              onChange={setReferenceCatalogPage}
              total={referenceCatalogTotalPages}
              value={referenceCatalogPage}
            />
            <Button onClick={closeReferenceCatalog} variant="default">
              Close
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Card className="section-card image-request-form">
        <Stack gap="md">
          <Title order={3}>Image request</Title>

          <div
            className="image-provider-loading-shell"
            data-testid="image-provider-loading-shell"
          >
            <LoadingOverlay
              loaderProps={{ type: 'bars' }}
              overlayProps={{ blur: 1, radius: 'md' }}
              visible={showCatalogLoadingOverlay}
              zIndex={2}
            />
            <Stack gap="md">
              <Select
                data={imageLab.providers.map((provider) => ({
                  value: provider.providerId,
                  label: provider.displayName,
                }))}
                data-testid="image-provider-select"
                label="Provider"
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
                label="Model"
                onChange={(value) => imageLab.setModelId(value ?? '')}
                value={imageLab.modelId}
              />

              {imageLab.hasNanoGptPaidModels ? (
                <Checkbox
                  checked={imageLab.showNanoGptPaidModels}
                  data-testid="nanogpt-paid-models-toggle"
                  label="Show NanoGPT paid-only models"
                  onChange={(event) =>
                    imageLab.setShowNanoGptPaidModels(event.currentTarget.checked)
                  }
                />
              ) : null}
            </Stack>
          </div>

          <Accordion chevronPosition="right" defaultValue="prompt-and-options" variant="separated">
            <Accordion.Item value="prompt-and-options">
              <Accordion.Control data-testid="prompt-options-accordion">
                Prompt and options
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Textarea
                    autosize
                    data-testid="image-prompt-input"
                    label="Prompt"
                    minRows={5}
                    onChange={(event) => imageLab.setPrompt(event.currentTarget.value)}
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
                      label="Aspect ratio"
                      onChange={(value) => imageLab.setAspectRatio(value ?? '')}
                      value={imageLab.aspectRatio}
                    />
                  ) : null}
                  {responseFormats.length ? (
                    <Select
                      data={responseFormats.map((format: 'url' | 'b64_json') => ({
                        value: format,
                        label: format === 'b64_json' ? 'Base64' : 'Hosted URL',
                      }))}
                      data-testid="image-response-format-select"
                      label="Response format"
                      onChange={(value) =>
                        imageLab.setResponseFormat((value as 'url' | 'b64_json') ?? 'b64_json')
                      }
                      value={imageLab.responseFormat}
                    />
                  ) : null}
                  <Select
                    data={buildImageCountOptions(maxGeneratedImagesPerRequest)}
                    data-testid="image-count-select"
                    label="Count"
                    onChange={(value) => imageLab.setImageCount(value ?? '1')}
                    value={imageLab.imageCount}
                  />
                </Group>

                <Group grow align="start">
                  {resolutions.length ? (
                    <Select
                      data={resolutions}
                      data-testid="image-resolution-select"
                      label="Resolution"
                      onChange={(value) => imageLab.setResolution(value ?? '')}
                      value={imageLab.resolution}
                    />
                  ) : null}
                  {backgrounds.length ? (
                    <Select
                      data={backgrounds}
                      data-testid="image-background-select"
                      label="Background"
                      onChange={(value) => imageLab.setBackground(value ?? '')}
                      value={imageLab.background}
                    />
                  ) : null}
                  {qualities.length ? (
                    <Select
                      data={qualities}
                      data-testid="image-quality-select"
                      label="Quality"
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
                      label="Moderation"
                      onChange={(value) => imageLab.setModeration(value ?? '')}
                      value={imageLab.moderation}
                    />
                  ) : null}
                </Group>

                <Group grow align="start">
                  {outputFormats.length ? (
                    <Select
                      data={outputFormats}
                      data-testid="image-output-format-select"
                      label="Output format"
                      onChange={(value) => imageLab.setOutputFormat(value ?? '')}
                      value={imageLab.outputFormat}
                    />
                  ) : null}
                  {outputCompressionRange ? (
                    <NumberInput
                      data-testid="image-output-compression-input"
                      label="Compression"
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
                  {imageLab.references.length > 0 && inputFidelities.length ? (
                    <Select
                      data={inputFidelities.map((option) => ({
                        value: (option as ImageInputFidelityOption).value,
                        label: (option as ImageInputFidelityOption).label,
                      }))}
                      data-testid="image-input-fidelity-select"
                      label="Input fidelity"
                      onChange={(value) => imageLab.setInputFidelity(value ?? '')}
                      value={imageLab.inputFidelity}
                    />
                  ) : null}
                </Group>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Alert color="blue" title="Reference assets">
            Upload through the gateway, paste a public image URL, or reuse images
            from history. Uploaded references stay reusable in the catalog below,
            while generated results remain in the history panel. One or more
            references switches the request into edit mode when the selected model
            supports editing.
          </Alert>

          {!imageLab.supportsImageEditing ? (
            <Alert color="yellow" title="Editing unavailable">
              This model currently supports generation only.
            </Alert>
          ) : null}

          {showNanoGptOpenAiAlignedNotice ? (
            <Alert color="blue" title="OpenAI-aligned GPT Image options">
              This NanoGPT model follows the OpenAI GPT image option set for
              resolution, background, quality, moderation, output format, and
              compression.
            </Alert>
          ) : null}

          {showGptImageModerationControl ? (
            <Alert color="blue" title="OpenAI moderation">
              Choosing <strong>Low</strong> makes filtering less restrictive, but it
              does not disable moderation. OpenAI can still reject prompts or images
              when safety checks are flagged.
            </Alert>
          ) : null}

          <Group align="end">
          <TextInput
            className="image-reference-url"
            data-testid="image-reference-url-input"
            label="Reference image URL"
            onChange={(event) => imageLab.setReferenceUrl(event.currentTarget.value)}
            placeholder="https://example.com/source.png"
            value={imageLab.referenceUrl}
          />
          <Button
            data-testid="image-add-reference-url"
            disabled={imageLab.references.length >= imageLab.maxReferenceImages}
            onClick={imageLab.addReferenceUrl}
            variant="light"
          >
            Add URL
          </Button>
          </Group>

          <Group>
          <Button
            component="label"
            data-testid="image-upload-reference"
            disabled={imageLab.references.length >= imageLab.maxReferenceImages}
            htmlFor="image-reference-upload-input"
            leftSection={<IconUpload size={16} />}
            variant="light"
          >
            Upload image
          </Button>
          <Text c="dimmed" size="sm">
            Uploaded files become gateway-managed reference assets.
          </Text>
          </Group>

          <Accordion chevronPosition="right" defaultValue={null} variant="separated">
          <Accordion.Item value="selected-references">
            <Accordion.Control data-testid="selected-references-accordion">
              {selectedReferencesLabel}
            </Accordion.Control>
            <Accordion.Panel>
              {imageLab.references.length ? (
                <Stack gap="xs">
                  {imageLab.references.map((reference) => (
                    <Card key={reference.id} padding="sm" radius="md" withBorder>
                      <Group align="flex-start" justify="space-between" wrap="nowrap">
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
                              {reference.kind === 'asset' ? reference.sourceType : 'url'}
                            </Badge>
                          </Stack>
                        </Group>
                        <Button
                          aria-label={`Remove ${reference.label}`}
                          color="red"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => imageLab.removeReference(reference.id)}
                          size="xs"
                          variant="subtle"
                        >
                          Remove
                        </Button>
                      </Group>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" size="sm">
                  No references selected yet.
                </Text>
              )}
            </Accordion.Panel>
          </Accordion.Item>
          </Accordion>

          <Stack gap="xs">
          <Group justify="space-between" wrap="wrap">
            <div>
              <Text fw={600} size="sm">
                Uploaded reference catalog
              </Text>
              <Text c="dimmed" size="xs">
                Reuse without uploading again
              </Text>
            </div>
            <Group gap="xs">
              <Badge color={referenceLimitReached ? 'orange' : 'teal'} variant="light">
                {imageLab.references.length} / {imageLab.maxReferenceImages} selected
              </Badge>
              <Button
                data-testid="reference-catalog-open"
                leftSection={<IconLibraryPhoto size={16} />}
                onClick={openReferenceCatalog}
                variant="light"
              >
                Browse catalog
              </Button>
            </Group>
          </Group>

          {referenceLimitReached ? (
            <Alert color="orange" title="Reference limit reached">
              This model supports up to {imageLab.maxReferenceImages} reference
              {imageLab.maxReferenceImages > 1 ? 's' : ''}. Remove one before adding more.
            </Alert>
          ) : (
            <Text c="dimmed" size="sm">
              Open the catalog to search, filter, rename, select, and paginate uploaded references.
            </Text>
          )}
          </Stack>

          {imageLab.requestError ? (
            <Alert color="red" title="Image request failed">
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

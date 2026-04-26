import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Image,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Tooltip,
  Title,
} from '@mantine/core';
import {
  IconCheck,
  IconChecks,
  IconRotateClockwise2,
  IconPencil,
  IconSparkles,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useState } from 'react';

import type {
  ImageAspectRatioOption,
  ImageInputFidelityOption,
  ProviderModelSummary,
} from '../../../lib/api-client.types';
import type { ReturnTypeUseImageLab } from '../use-image-lab.types';

export function ImageRequestForm({
  imageLab,
}: {
  imageLab: ReturnTypeUseImageLab;
}) {
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [pendingDeleteAssetId, setPendingDeleteAssetId] = useState<string | null>(
    null,
  );
  const [assetSearch, setAssetSearch] = useState('');
  const [assetSort, setAssetSort] = useState<'newest' | 'oldest' | 'label'>('newest');
  const [assetFilter, setAssetFilter] = useState<'all' | 'available' | 'selected'>(
    'all',
  );
  const capabilities = imageLab.selectedModel?.capabilities;
  const aspectRatios = capabilities?.supportedImageAspectRatios ?? [];
  const responseFormats = capabilities?.supportedImageResponseFormats ?? [];
  const resolutions = capabilities?.supportedImageResolutions ?? [];
  const backgrounds = capabilities?.supportedImageBackgrounds ?? [];
  const qualities = capabilities?.supportedImageQualities ?? [];
  const outputFormats = capabilities?.supportedImageOutputFormats ?? [];
  const inputFidelities = capabilities?.supportedImageInputFidelities ?? [];
  const outputCompressionRange = capabilities?.imageOutputCompressionRange;
  const maxGeneratedImagesPerRequest = capabilities?.maxGeneratedImagesPerRequest ?? 1;
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

  return (
    <Card className="section-card">
      <Stack gap="md">
        <Title order={3}>Image request</Title>

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

        {imageLab.references.length ? (
          <Stack gap="xs">
            <Text fw={600} size="sm">
              Selected references
            </Text>
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
        ) : null}

        <Stack gap="xs">
          <Group justify="space-between" wrap="nowrap">
            <Text fw={600} size="sm">
              Uploaded reference catalog
            </Text>
            <Text c="dimmed" size="xs">
              Reuse without uploading again
            </Text>
          </Group>

          <Group grow align="end">
            <TextInput
              data-testid="reference-catalog-search"
              label="Search"
              onChange={(event) => setAssetSearch(event.currentTarget.value)}
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
              onChange={(value) =>
                setAssetSort((value as 'newest' | 'oldest' | 'label') ?? 'newest')
              }
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
              onChange={(value) =>
                setAssetFilter((value as 'all' | 'available' | 'selected') ?? 'all')
              }
              value={assetFilter}
            />
          </Group>

          {filteredReferenceAssets.length ? (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {filteredReferenceAssets.map((asset) => {
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
                            disabled={
                              alreadySelected ||
                              imageLab.references.length >= imageLab.maxReferenceImages
                            }
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

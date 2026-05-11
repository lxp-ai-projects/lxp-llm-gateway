import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  Checkbox,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconLibraryPhoto,
  IconTrash,
  IconUpload,
  IconVideo,
} from '@tabler/icons-react';
import { useState } from 'react';

import type { GatewayImageAssetSummary } from '../../../lib/api-client.types';
import type { ReturnTypeUseVideoLab } from '../use-video-lab.types';

const REFERENCE_CATALOG_PAGE_SIZE = 6;

export function VideoRequestForm({
  videoLab,
}: {
  videoLab: ReturnTypeUseVideoLab;
}) {
  const [referenceCatalogOpened, setReferenceCatalogOpened] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetSort, setAssetSort] = useState<'newest' | 'oldest' | 'label'>('newest');
  const [assetFilter, setAssetFilter] = useState<'all' | 'available' | 'selected'>(
    'all',
  );
  const [referenceCatalogPage, setReferenceCatalogPage] = useState(1);
  const isSmallViewport = useMediaQuery('(max-width: 48em)');
  const capabilities = videoLab.capabilities;
  const family = videoLab.family;
  const aspectRatios = capabilities?.supportedVideoAspectRatios ?? [];
  const resolutions = capabilities?.supportedVideoResolutions ?? [];
  const sizes = capabilities?.supportedVideoSizes ?? [];
  const durations = capabilities?.supportedVideoDurations ?? [];
  const familyModes = family?.video?.generationModes ?? [];
  const familyIssues = videoLab.familyValidation.issues;
  const selectedAssetIds = new Set(
    videoLab.references
      .filter((reference) => reference.kind === 'asset')
      .map((reference) => reference.assetId),
  );
  const referenceLimitReached =
    videoLab.references.length >= videoLab.maxReferenceImages;
  const filteredReferenceAssets = videoLab.referenceAssets
    .filter((asset) => {
      const normalizedSearch = assetSearch.trim().toLowerCase();
      if (
        normalizedSearch &&
        !(asset.label ?? 'Gateway image asset').toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      const alreadySelected = selectedAssetIds.has(asset.id);

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
              Reuse uploaded image assets for video requests without uploading again.
            </Text>
            <Badge color={referenceLimitReached ? 'orange' : 'teal'} variant="light">
              {videoLab.references.length} / {videoLab.maxReferenceImages} selected
            </Badge>
          </Group>

          {referenceLimitReached ? (
            <Alert color="orange" title="Reference limit reached">
              This model supports up to {videoLab.maxReferenceImages} reference
              {videoLab.maxReferenceImages > 1 ? 's' : ''}. Remove one before adding more.
            </Alert>
          ) : null}

          <Group grow align="end">
            <TextInput
              data-testid="video-reference-catalog-search"
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
              data-testid="video-reference-catalog-sort"
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
              data-testid="video-reference-catalog-filter"
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
                const alreadySelected = selectedAssetIds.has(asset.id);

                return (
                  <ReferenceCatalogAssetCard
                    alreadySelected={alreadySelected}
                    asset={asset}
                    assetSrc={videoLab.mediaUrl(asset.contentUrl) ?? asset.contentUrl}
                    disabled={referenceLimitReached}
                    key={asset.id}
                    onSelect={() => videoLab.addReferenceAsset(asset)}
                  />
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

      <Card className="section-card">
        <Stack gap="md">
          <Title order={3}>Video request</Title>

          <Alert color="blue" title="MVP flow">
            This first lab is optimized for image-to-video. If you leave references
            empty, the same contract still works in text-to-video mode.
          </Alert>

          <Select
            data={videoLab.providers.map((provider) => ({
              value: provider.providerId,
              label: provider.displayName,
            }))}
            data-testid="video-provider-select"
            label="Provider"
            onChange={(value) => {
              videoLab.setProviderId(value ?? '');
              videoLab.setModelId('');
            }}
            value={videoLab.providerId}
          />

          <Select
            data={videoLab.models.map((model) => ({
              value: model.id,
              label: model.displayName,
            }))}
            data-testid="video-model-select"
            label="Model"
            onChange={(value) => videoLab.setModelId(value ?? '')}
            value={videoLab.modelId}
          />

          {family ? (
            <Card padding="sm" radius="md" withBorder>
              <Stack gap="xs">
                <Group gap="xs">
                  <Badge color="teal" variant="light">
                    {family.displayName}
                  </Badge>
                  <Badge color="gray" variant="light">
                    {videoLab.currentMode}
                  </Badge>
                </Group>
                {family.summary ? (
                  <Text c="dimmed" size="sm">
                    {family.summary}
                  </Text>
                ) : null}
                {familyModes.length ? (
                  <Group gap="xs">
                    {familyModes.map((mode) => (
                      <Badge
                        color={mode === videoLab.currentMode ? 'teal' : 'gray'}
                        key={mode}
                        variant={mode === videoLab.currentMode ? 'filled' : 'light'}
                      >
                        {mode}
                      </Badge>
                    ))}
                  </Group>
                ) : null}
              </Stack>
            </Card>
          ) : null}

          <Textarea
            autosize
            data-testid="video-prompt-input"
            label="Prompt"
            minRows={5}
            onChange={(event) => videoLab.setPrompt(event.currentTarget.value)}
            placeholder="Describe the motion, camera movement, subject, and atmosphere."
            value={videoLab.prompt}
          />

          <Group grow align="end">
            {durations.length ? (
              <Select
                data={durations.map((option) => ({
                  value: String(option.value),
                  label: option.label,
                }))}
                data-testid="video-duration-select"
                label="Duration"
                onChange={(value) => videoLab.setDurationSeconds(value ?? '')}
                value={videoLab.durationSeconds}
              />
            ) : null}
            {aspectRatios.length ? (
              <Select
                data={aspectRatios.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                data-testid="video-aspect-ratio-select"
                label="Aspect ratio"
                onChange={(value) => videoLab.setAspectRatio(value ?? '')}
                value={videoLab.aspectRatio}
              />
            ) : null}
          </Group>

          <Group grow align="end">
            {resolutions.length ? (
              <Select
                data={resolutions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                data-testid="video-resolution-select"
                label="Resolution"
                onChange={(value) => videoLab.setResolution(value ?? '')}
                value={videoLab.resolution}
              />
            ) : null}
            {sizes.length ? (
              <Select
                data={sizes.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                data-testid="video-size-select"
                label="Size"
                onChange={(value) => videoLab.setSize(value ?? '')}
                value={videoLab.size}
              />
            ) : null}
          </Group>

          {videoLab.supportsAudioGeneration ? (
            <Checkbox
              checked={videoLab.generateAudio}
              data-testid="video-generate-audio-toggle"
              label="Generate audio when the model supports it"
              onChange={(event) =>
                videoLab.setGenerateAudio(event.currentTarget.checked)
              }
            />
          ) : null}

          {!videoLab.supportsReferenceImages ? (
            <Alert color="yellow" title="Reference images unavailable">
              This model currently accepts prompt-only video generation.
            </Alert>
          ) : (
            <>
              <Group align="end">
                <TextInput
                  data-testid="video-reference-url-input"
                  label="Reference image URL"
                  onChange={(event) =>
                    videoLab.setReferenceUrl(event.currentTarget.value)
                  }
                  placeholder="https://example.com/scene-frame.jpg or data:image/...;base64,..."
                  value={videoLab.referenceUrl}
                />
                <Button
                  data-testid="video-add-reference-url"
                  disabled={referenceLimitReached}
                  onClick={() => {
                    void videoLab.addReferenceUrl();
                  }}
                  variant="light"
                >
                  Add reference
                </Button>
              </Group>

              <Group justify="space-between" wrap="wrap">
                <Group>
                  <input
                    accept="image/*"
                    disabled={referenceLimitReached}
                    hidden
                    id="video-reference-upload-input"
                    onChange={(event) => {
                      void videoLab.handleFileSelection(event.currentTarget.files);
                      event.currentTarget.value = '';
                    }}
                    ref={videoLab.fileInputRef}
                    type="file"
                  />
                  <Button
                    component="label"
                    data-testid="video-upload-reference"
                    disabled={referenceLimitReached}
                    htmlFor="video-reference-upload-input"
                    leftSection={<IconUpload size={16} />}
                    variant="light"
                  >
                    Upload image
                  </Button>
                  <Button
                    data-testid="video-reference-catalog-open"
                    leftSection={<IconLibraryPhoto size={16} />}
                    onClick={openReferenceCatalog}
                    variant="light"
                  >
                    Browse catalog
                  </Button>
                </Group>
                <Badge color={referenceLimitReached ? 'orange' : 'teal'} variant="light">
                  {videoLab.references.length} / {videoLab.maxReferenceImages} selected
                </Badge>
              </Group>

              <Text c="dimmed" size="sm">
                Uploaded or pasted image data becomes a reusable gateway-managed image asset.
                Browse catalog reuses the same uploaded asset pool as the image lab.
              </Text>

              <Stack gap="xs">
                <Text fw={600} size="sm">
                  Selected references
                </Text>
                {videoLab.references.length ? (
                  videoLab.references.map((reference) => (
                    <Card key={reference.id} padding="sm" radius="md" withBorder>
                      <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <Group align="flex-start" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
                          <Image
                            alt={reference.label}
                            h={72}
                            radius="md"
                            src={reference.previewUrl}
                            w={72}
                          />
                          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                            <Text lineClamp={2} size="sm">
                              {reference.label}
                            </Text>
                            <Badge size="sm" variant="light">
                              {reference.kind === 'asset' ? reference.sourceType : 'url'}
                            </Badge>
                          </Stack>
                        </Group>
                        <Button
                          color="red"
                          data-testid={`video-reference-remove-${reference.id}`}
                          leftSection={<IconTrash size={14} />}
                          onClick={() => videoLab.removeReference(reference.id)}
                          size="xs"
                          style={{ flexShrink: 0 }}
                          variant="subtle"
                        >
                          Remove
                        </Button>
                      </Group>
                    </Card>
                  ))
                ) : (
                  <Text c="dimmed" size="sm">
                    No reference selected. Submit now for text-to-video, or add an
                    image for image-to-video.
                  </Text>
                )}
              </Stack>

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
                  <Button
                    data-testid="video-reference-catalog-open-secondary"
                    leftSection={<IconLibraryPhoto size={16} />}
                    onClick={openReferenceCatalog}
                    variant="light"
                  >
                    Browse catalog
                  </Button>
                </Group>
                {referenceLimitReached ? (
                  <Alert color="orange" title="Reference limit reached">
                    Remove a selected reference before adding another one from the catalog.
                  </Alert>
                ) : (
                  <Text c="dimmed" size="sm">
                    Open the catalog to search, filter, and paginate the same uploaded image assets used by the image lab.
                  </Text>
                )}
              </Stack>
            </>
          )}

          {familyIssues.length ? (
            <Alert color="yellow" title="Model-family validation">
              {familyIssues[0]?.message}
            </Alert>
          ) : null}

          {videoLab.requestError ? (
            <Alert color="red" title="Video request failed">
              {videoLab.requestError}
            </Alert>
          ) : null}

          <Button
            data-testid="video-submit"
            leftSection={<IconVideo size={16} />}
            loading={videoLab.generateMutation.isPending}
            onClick={() => videoLab.generateMutation.mutate(undefined)}
          >
            {videoLab.references.length ? 'Generate video from image' : 'Generate video'}
          </Button>
        </Stack>
      </Card>
    </>
  );
}

function ReferenceCatalogAssetCard({
  asset,
  assetSrc,
  alreadySelected,
  disabled,
  onSelect,
}: {
  asset: GatewayImageAssetSummary;
  assetSrc: string;
  alreadySelected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <Card padding="sm" radius="md" withBorder>
      <Stack gap="xs">
        <Image
          alt={asset.label ?? 'Uploaded image asset'}
          h={120}
          radius="md"
          src={assetSrc}
        />
        <Text lineClamp={2} size="sm">
          {asset.label ?? 'Gateway image asset'}
        </Text>
        <Text c="dimmed" size="xs">
          {new Date(asset.createdAt).toLocaleString()}
        </Text>
        <Group justify="space-between" wrap="wrap">
          <Badge color="gray" size="sm" variant="light">
            upload
          </Badge>
          <Badge color={alreadySelected ? 'teal' : 'blue'} size="sm" variant="light">
            {alreadySelected ? 'Selected' : 'Available'}
          </Badge>
        </Group>
        <Button
          data-testid={`video-reference-catalog-use-${asset.id}`}
          disabled={alreadySelected || disabled}
          onClick={onSelect}
          size="xs"
          variant="light"
        >
          {alreadySelected ? 'Selected' : 'Use as reference'}
        </Button>
      </Stack>
    </Card>
  );
}

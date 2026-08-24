import { useTranslation } from 'react-i18next';
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
import { formatDateTime } from '../../../i18n/format';
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
  const { t } = useTranslation('video');
  const [referenceCatalogOpened, setReferenceCatalogOpened] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetSort, setAssetSort] = useState<'newest' | 'oldest' | 'label'>(
    'newest',
  );
  const [assetFilter, setAssetFilter] = useState<
    'all' | 'available' | 'selected'
  >('all');
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
        !(asset.label ?? 'Gateway image asset')
          .toLowerCase()
          .includes(normalizedSearch)
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
        title={t('videoRequestForm.uploadedReferenceCatalog')}
      >
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap">
            <Text c="dimmed" size="sm">
              {t('videoRequestForm.reuseUploadedImageAssetsForVideoRequests')}
            </Text>
            <Badge
              color={referenceLimitReached ? 'orange' : 'teal'}
              variant="light"
            >
              {videoLab.references.length} / {videoLab.maxReferenceImages}{' '}
              {t('videoRequestForm.selected')}
            </Badge>
          </Group>

          {referenceLimitReached ? (
            <Alert
              color="orange"
              title={t('videoRequestForm.referenceLimitReached')}
            >
              {t('videoRequestForm.referenceLimitDescription', {
                count: videoLab.maxReferenceImages,
              })}
            </Alert>
          ) : null}

          <Group grow align="end">
            <TextInput
              data-testid="video-reference-catalog-search"
              label={t('videoRequestForm.search')}
              onChange={(event) => {
                setAssetSearch(event.currentTarget.value);
                setReferenceCatalogPage(1);
              }}
              placeholder={t('videoRequestForm.searchByLabel')}
              value={assetSearch}
            />
            <Select
              data={[
                { value: 'newest', label: t('videoRequestForm.newest') },
                { value: 'oldest', label: t('videoRequestForm.oldest') },
                { value: 'label', label: t('videoRequestForm.label') },
              ]}
              data-testid="video-reference-catalog-sort"
              label={t('videoRequestForm.sort')}
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
                { value: 'all', label: t('videoRequestForm.all') },
                {
                  value: 'available',
                  label: t('videoRequestForm.available'),
                },
                {
                  value: 'selected',
                  label: t('videoRequestForm.selectedState'),
                },
              ]}
              data-testid="video-reference-catalog-filter"
              label={t('videoRequestForm.filter')}
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
                const alreadySelected = selectedAssetIds.has(asset.id);

                return (
                  <ReferenceCatalogAssetCard
                    alreadySelected={alreadySelected}
                    asset={asset}
                    assetSrc={
                      videoLab.mediaUrl(asset.contentUrl) ?? asset.contentUrl
                    }
                    disabled={referenceLimitReached}
                    key={asset.id}
                    onSelect={() => videoLab.addReferenceAsset(asset)}
                  />
                );
              })}
            </SimpleGrid>
          ) : (
            <Text c="dimmed" size="sm">
              {t('videoRequestForm.noUploadedReferencesMatchTheCurrentFilters')}
            </Text>
          )}

          <Group justify="space-between" wrap="wrap">
            <Text c="dimmed" size="sm">
              {t('videoRequestForm.page')}
              {referenceCatalogPage} / {referenceCatalogTotalPages}
            </Text>
            <Pagination
              onChange={setReferenceCatalogPage}
              total={referenceCatalogTotalPages}
              value={referenceCatalogPage}
            />
            <Button onClick={closeReferenceCatalog} variant="default">
              {t('videoRequestForm.close')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Card className="section-card">
        <Stack gap="md">
          <Title order={3}>{t('videoRequestForm.videoRequest')}</Title>

          <Alert color="blue" title={t('videoRequestForm.mvpFlow')}>
            {t('videoRequestForm.thisFirstLabIsOptimizedForImage')}
          </Alert>

          <Select
            data={videoLab.providers.map((provider) => ({
              value: provider.providerId,
              label: provider.displayName,
            }))}
            data-testid="video-provider-select"
            label={t('videoRequestForm.provider')}
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
            label={t('videoRequestForm.model')}
            limit={100}
            nothingFoundMessage={t('videoRequestForm.noModelsFound')}
            onChange={(value) => videoLab.setModelId(value ?? '')}
            searchable
            selectFirstOptionOnChange
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
                        variant={
                          mode === videoLab.currentMode ? 'filled' : 'light'
                        }
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
            label={t('videoRequestForm.prompt')}
            minRows={5}
            onChange={(event) => videoLab.setPrompt(event.currentTarget.value)}
            placeholder={t(
              'videoRequestForm.describeTheMotionCameraMovementSubjectAnd',
            )}
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
                label={t('videoRequestForm.duration')}
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
                label={t('videoRequestForm.aspectRatio')}
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
                label={t('videoRequestForm.resolution')}
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
                label={t('videoRequestForm.size')}
                onChange={(value) => videoLab.setSize(value ?? '')}
                value={videoLab.size}
              />
            ) : null}
          </Group>

          {videoLab.supportsAudioGeneration ? (
            <Checkbox
              checked={videoLab.generateAudio}
              data-testid="video-generate-audio-toggle"
              label={t('videoRequestForm.generateAudioWhenTheModelSupportsIt')}
              onChange={(event) =>
                videoLab.setGenerateAudio(event.currentTarget.checked)
              }
            />
          ) : null}

          {!videoLab.supportsReferenceImages ? (
            <Alert
              color="yellow"
              title={t('videoRequestForm.referenceImagesUnavailable')}
            >
              {t('videoRequestForm.thisModelCurrentlyAcceptsPromptOnlyVideo')}
            </Alert>
          ) : (
            <>
              <Group align="end">
                <TextInput
                  data-testid="video-reference-url-input"
                  label={t('videoRequestForm.referenceImageURL')}
                  onChange={(event) =>
                    videoLab.setReferenceUrl(event.currentTarget.value)
                  }
                  placeholder={t(
                    'videoRequestForm.httpsExampleComSceneFrameJpgOr',
                  )}
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
                  {t('videoRequestForm.addReference')}
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
                      void videoLab.handleFileSelection(
                        event.currentTarget.files,
                      );
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
                    {t('videoRequestForm.uploadImage')}
                  </Button>
                  <Button
                    data-testid="video-reference-catalog-open"
                    leftSection={<IconLibraryPhoto size={16} />}
                    onClick={openReferenceCatalog}
                    variant="light"
                  >
                    {t('videoRequestForm.browseCatalog')}
                  </Button>
                </Group>
                <Badge
                  color={referenceLimitReached ? 'orange' : 'teal'}
                  variant="light"
                >
                  {videoLab.references.length} / {videoLab.maxReferenceImages}{' '}
                  {t('videoRequestForm.selected')}
                </Badge>
              </Group>

              <Text c="dimmed" size="sm">
                {t('videoRequestForm.uploadedOrPastedImageDataBecomesA')}
              </Text>

              <Stack gap="xs">
                <Text fw={600} size="sm">
                  {t('videoRequestForm.selectedReferences')}
                </Text>
                {videoLab.references.length ? (
                  videoLab.references.map((reference) => (
                    <Card
                      key={reference.id}
                      padding="sm"
                      radius="md"
                      withBorder
                    >
                      <Group
                        justify="space-between"
                        align="flex-start"
                        wrap="nowrap"
                      >
                        <Group
                          align="flex-start"
                          style={{ flex: 1, minWidth: 0 }}
                          wrap="nowrap"
                        >
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
                              {reference.kind === 'asset'
                                ? reference.sourceType
                                : 'url'}
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
                          {t('videoRequestForm.remove')}
                        </Button>
                      </Group>
                    </Card>
                  ))
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('videoRequestForm.noReferenceSelectedSubmitNowForText')}
                  </Text>
                )}
              </Stack>

              <Stack gap="xs">
                <Group justify="space-between" wrap="wrap">
                  <div>
                    <Text fw={600} size="sm">
                      {t('videoRequestForm.uploadedReferenceCatalog')}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {t('videoRequestForm.reuseWithoutUploadingAgain')}
                    </Text>
                  </div>
                  <Button
                    data-testid="video-reference-catalog-open-secondary"
                    leftSection={<IconLibraryPhoto size={16} />}
                    onClick={openReferenceCatalog}
                    variant="light"
                  >
                    {t('videoRequestForm.browseCatalog')}
                  </Button>
                </Group>
                {referenceLimitReached ? (
                  <Alert
                    color="orange"
                    title={t('videoRequestForm.referenceLimitReached')}
                  >
                    {t(
                      'videoRequestForm.removeASelectedReferenceBeforeAddingAnother',
                    )}
                  </Alert>
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('videoRequestForm.openTheCatalogToSearchFilterAnd')}
                  </Text>
                )}
              </Stack>
            </>
          )}

          {familyIssues.length ? (
            <Alert
              color="yellow"
              title={t('videoRequestForm.modelFamilyValidation')}
            >
              {familyIssues[0]?.message}
            </Alert>
          ) : null}

          {videoLab.requestError ? (
            <Alert color="red" title={t('videoRequestForm.videoRequestFailed')}>
              {videoLab.requestError}
            </Alert>
          ) : null}

          <Button
            data-testid="video-submit"
            leftSection={<IconVideo size={16} />}
            loading={videoLab.generateMutation.isPending}
            onClick={() => videoLab.generateMutation.mutate(undefined)}
          >
            {videoLab.references.length
              ? t('videoRequestForm.generateFromImage')
              : t('videoRequestForm.generate')}
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
  const { t } = useTranslation('video');
  return (
    <Card padding="sm" radius="md" withBorder>
      <Stack gap="xs">
        <Image
          alt={asset.label ?? t('videoRequestForm.uploadedImageAsset')}
          h={120}
          radius="md"
          src={assetSrc}
        />
        <Text lineClamp={2} size="sm">
          {asset.label ?? t('videoRequestForm.gatewayImageAsset')}
        </Text>
        <Text c="dimmed" size="xs">
          {formatDateTime(asset.createdAt)}
        </Text>
        <Group justify="space-between" wrap="wrap">
          <Badge color="gray" size="sm" variant="light">
            {t('referenceCatalogAssetCard.upload')}
          </Badge>
          <Badge
            color={alreadySelected ? 'teal' : 'blue'}
            size="sm"
            variant="light"
          >
            {alreadySelected
              ? t('videoRequestForm.selectedState')
              : t('videoRequestForm.available')}
          </Badge>
        </Group>
        <Button
          data-testid={`video-reference-catalog-use-${asset.id}`}
          disabled={alreadySelected || disabled}
          onClick={onSelect}
          size="xs"
          variant="light"
        >
          {alreadySelected
            ? t('videoRequestForm.selectedState')
            : t('videoRequestForm.useAsReference')}
        </Button>
      </Stack>
    </Card>
  );
}

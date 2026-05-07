import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  Image,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { IconTrash, IconUpload, IconVideo } from '@tabler/icons-react';

import type { GatewayImageAssetSummary } from '../../../lib/api-client.types';
import type { ReturnTypeUseVideoLab } from '../use-video-lab.types';

export function VideoRequestForm({
  videoLab,
}: {
  videoLab: ReturnTypeUseVideoLab;
}) {
  const capabilities = videoLab.capabilities;
  const aspectRatios = capabilities?.supportedVideoAspectRatios ?? [];
  const resolutions = capabilities?.supportedVideoResolutions ?? [];
  const sizes = capabilities?.supportedVideoSizes ?? [];
  const durations = capabilities?.supportedVideoDurations ?? [];
  const selectedAssetIds = new Set(
    videoLab.references
      .filter((reference) => reference.kind === 'asset')
      .map((reference) => reference.assetId),
  );

  return (
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
                placeholder="https://example.com/scene-frame.jpg"
                value={videoLab.referenceUrl}
              />
              <Button
                data-testid="video-add-reference-url"
                disabled={videoLab.references.length >= videoLab.maxReferenceImages}
                onClick={videoLab.addReferenceUrl}
                variant="light"
              >
                Add URL
              </Button>
            </Group>

            <Group justify="space-between" wrap="wrap">
              <Group>
                <Button
                  component="label"
                  data-testid="video-upload-reference"
                  disabled={videoLab.references.length >= videoLab.maxReferenceImages}
                  htmlFor="video-reference-upload-input"
                  leftSection={<IconUpload size={16} />}
                  variant="light"
                >
                  Upload image
                </Button>
                <Text c="dimmed" size="sm">
                  Uploaded references become gateway-managed image assets.
                </Text>
              </Group>
              <Badge color="teal" variant="light">
                {videoLab.references.length} / {videoLab.maxReferenceImages} selected
              </Badge>
            </Group>

            <Stack gap="xs">
              <Text fw={600} size="sm">
                Selected references
              </Text>
              {videoLab.references.length ? (
                videoLab.references.map((reference) => (
                  <Card key={reference.id} padding="sm" radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap">
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
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => videoLab.removeReference(reference.id)}
                        size="xs"
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
              <Text fw={600} size="sm">
                Uploaded image assets
              </Text>
              {!videoLab.referenceAssets.length ? (
                <Text c="dimmed" size="sm">
                  Upload an image to seed the first video job.
                </Text>
              ) : (
                videoLab.referenceAssets
                  .slice(0, 6)
                  .map((asset) => (
                    <UploadedAssetCard
                      asset={asset}
                      assetSrc={videoLab.mediaUrl(asset.contentUrl) ?? asset.contentUrl}
                      alreadySelected={selectedAssetIds.has(asset.id)}
                      key={asset.id}
                      onSelect={() => videoLab.addReferenceAsset(asset)}
                    />
                  ))
              )}
            </Stack>
          </>
        )}

        {videoLab.requestError ? (
          <Alert color="red" title="Video request failed">
            {videoLab.requestError}
          </Alert>
        ) : null}

        <Button
          data-testid="video-submit"
          leftSection={<IconVideo size={16} />}
          loading={videoLab.generateMutation.isPending}
          onClick={() => videoLab.generateMutation.mutate()}
        >
          {videoLab.references.length ? 'Generate video from image' : 'Generate video'}
        </Button>
      </Stack>
    </Card>
  );
}

function UploadedAssetCard({
  asset,
  assetSrc,
  alreadySelected,
  onSelect,
}: {
  asset: GatewayImageAssetSummary;
  assetSrc: string;
  alreadySelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card padding="sm" radius="md" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Group align="flex-start" wrap="nowrap">
          <Image
            alt={asset.label ?? 'Uploaded image asset'}
            h={72}
            radius="md"
            src={assetSrc}
            w={72}
          />
          <Stack gap={4}>
            <Text lineClamp={2} size="sm">
              {asset.label ?? 'Gateway image asset'}
            </Text>
            <Text c="dimmed" size="xs">
              {new Date(asset.createdAt).toLocaleString()}
            </Text>
          </Stack>
        </Group>
        <Button
          disabled={alreadySelected}
          onClick={onSelect}
          size="xs"
          variant="light"
        >
          {alreadySelected ? 'Selected' : 'Use'}
        </Button>
      </Group>
    </Card>
  );
}

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Progress,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import type { CSSProperties } from 'react';

import type { ReturnTypeUseImageLab } from '../use-image-lab.types';

export function ImageResultsPanel({
  imageLab,
}: {
  imageLab: ReturnTypeUseImageLab;
}) {
  const selectedAspectRatio = resolveCssAspectRatio(imageLab.aspectRatio);
  const loadingCards = Array.from(
    { length: imageLab.pendingResultCount },
    (_, index) => index,
  );

  return (
    <Card className="section-card">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>Results</Title>
          <Badge color={imageLab.canEdit ? 'orange' : 'teal'} variant="light">
            {imageLab.canEdit ? 'Edit mode' : 'Generation mode'}
          </Badge>
        </Group>

        {imageLab.generateMutation.isPending ? (
          <div className="image-results-grid">
            {loadingCards.map((index) => (
              <Card
                key={`image-loading-${index}`}
                className="image-result-card"
                data-testid={`image-loading-${index}`}
                padding="sm"
                radius="lg"
                style={{
                  '--image-result-aspect-ratio': selectedAspectRatio,
                } as CSSProperties}
                withBorder
              >
                <Stack gap="sm">
                  <div
                    aria-hidden="true"
                    className="image-result-loading"
                  >
                    <div className="image-result-loading-plasma" />
                    <div className="image-result-loading-glow" />
                  </div>
                  <Group justify="space-between" wrap="nowrap">
                    <Text fw={600} size="sm">
                      Rendering {index + 1}
                    </Text>
                    <Badge color="cyan" variant="light">
                      In progress
                    </Badge>
                  </Group>
                  <Text c="dimmed" size="sm">
                    The gateway is generating this image.
                  </Text>
                  <Group gap="md" grow>
                    <Stack gap={2}>
                      <Text c="dimmed" size="xs" tt="uppercase">
                        Elapsed
                      </Text>
                      <Text data-testid={`image-loading-elapsed-${index}`} fw={600} size="sm">
                        {formatDuration(imageLab.currentRenderElapsedMs)}
                      </Text>
                    </Stack>
                    <Stack gap={2}>
                      <Text c="dimmed" size="xs" tt="uppercase">
                        Estimated
                      </Text>
                      <Text data-testid={`image-loading-estimated-${index}`} fw={600} size="sm">
                        {imageLab.estimatedRenderDurationMs
                          ? formatDuration(imageLab.estimatedRenderDurationMs)
                          : 'Calculating...'}
                      </Text>
                    </Stack>
                  </Group>
                  {imageLab.currentRenderProgressPercent !== null ? (
                    <Stack gap={4}>
                      <Progress
                        aria-label={`Rendering progress ${index + 1}`}
                        data-testid={`image-loading-progress-${index}`}
                        radius="xl"
                        size="md"
                        value={imageLab.currentRenderProgressPercent}
                      />
                      <Text c="dimmed" size="xs">
                        Estimate based on {imageLab.estimatedRenderSampleSize} previous{' '}
                        {imageLab.estimatedRenderSampleSize === 1 ? 'run' : 'runs'} for this
                        provider and model.
                      </Text>
                    </Stack>
                  ) : null}
                </Stack>
              </Card>
            ))}
          </div>
        ) : !imageLab.results.length ? (
          <Alert color="gray" title="No images yet">
            Submit a prompt to render image results here.
          </Alert>
        ) : (
          <div className="image-results-grid">
            {imageLab.results.map((image, index) => {
              const src = resolveImageResultSource(imageLab, image);

              return (
                <Card
                  key={`${image.assetId ?? image.url ?? image.b64Json ?? index}`}
                  className="image-result-card"
                  data-testid={`image-result-${index}`}
                  padding="sm"
                  radius="lg"
                  style={{
                    '--image-result-aspect-ratio': selectedAspectRatio,
                  } as CSSProperties}
                  withBorder
                >
                  <Stack gap="sm">
                    {src ? (
                      <div className="image-result-preview">
                        <Image alt={`Generated result ${index + 1}`} radius="md" src={src} />
                      </div>
                    ) : (
                      <Alert color="yellow" title="No preview available">
                        The gateway returned an image entry without a displayable payload.
                      </Alert>
                    )}
                    <Group justify="space-between" wrap="nowrap">
                      <Text fw={600} size="sm">
                        Result {index + 1}
                      </Text>
                      <Group gap="xs">
                        {image.assetId ? (
                          <>
                            <Button
                              onClick={() =>
                                imageLab.addReferenceAsset({
                                  id: image.assetId!,
                                  label: `Result ${index + 1}`,
                                  mimeType: image.mimeType ?? null,
                                  contentUrl: image.contentUrl ?? '',
                                  sourceType: 'generated',
                                  saved: image.saved ?? false,
                                  createdAt: new Date().toISOString(),
                                })
                              }
                              size="xs"
                              variant="light"
                            >
                              Use as reference
                            </Button>
                            <Button
                              onClick={() =>
                                imageLab.saveMutation.mutate({
                                  assetId: image.assetId!,
                                  saved: !(image.saved ?? false),
                                })
                              }
                              size="xs"
                              variant="default"
                            >
                              {image.saved ? 'Saved' : 'Save'}
                            </Button>
                          </>
                        ) : null}
                      </Group>
                    </Group>
                    {image.revisedPrompt ? (
                      <Text c="dimmed" size="sm">
                        Revised prompt: {image.revisedPrompt}
                      </Text>
                    ) : null}
                  </Stack>
                </Card>
              );
            })}
          </div>
        )}
      </Stack>
    </Card>
  );
}

function resolveCssAspectRatio(value: string | undefined) {
  if (!value?.includes(':')) {
    return '1 / 1';
  }

  const [width, height] = value.split(':').map((part) => Number(part.trim()));
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '1 / 1';
  }

  return `${width} / ${height}`;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function resolveImageResultSource(
  imageLab: ReturnTypeUseImageLab,
  image: ReturnTypeUseImageLab['results'][number],
) {
  if (image.contentUrl) {
    return imageLab.mediaUrl(image.contentUrl);
  }

  if (image.url) {
    return image.url;
  }

  if (image.b64Json) {
    return `data:${image.mimeType ?? 'image/png'};base64,${image.b64Json}`;
  }

  return '';
}

import { Alert, Badge, Button, Card, Group, Image, Stack, Text, Title } from '@mantine/core';

import type { ReturnTypeUseImageLab } from '../use-image-lab.types';

export function ImageResultsPanel({
  imageLab,
}: {
  imageLab: ReturnTypeUseImageLab;
}) {
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
              const src =
                image.contentUrl
                  ? imageLab.mediaUrl(image.contentUrl)
                  : image.url ?? (image.b64Json ? `data:image/png;base64,${image.b64Json}` : '');

              return (
                <Card
                  key={`${image.assetId ?? image.url ?? image.b64Json ?? index}`}
                  className="image-result-card"
                  data-testid={`image-result-${index}`}
                  padding="sm"
                  radius="lg"
                  withBorder
                >
                  <Stack gap="sm">
                    {src ? (
                      <Image alt={`Generated result ${index + 1}`} radius="md" src={src} />
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

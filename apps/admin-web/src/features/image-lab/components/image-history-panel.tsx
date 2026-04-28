import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Image,
  Modal,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';

import { copyText } from '../../../lib/copy-text';
import type { ReturnTypeUseImageLab } from '../use-image-lab.types';

export function ImageHistoryPanel({
  imageLab,
}: {
  imageLab: ReturnTypeUseImageLab;
}) {
  const history = imageLab.history;
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const isSmallViewport = useMediaQuery('(max-width: 48em)');

  return (
    <>
      <Modal
        centered
        fullScreen={isSmallViewport}
        onClose={() => setSelectedImage(null)}
        opened={selectedImage !== null}
        size={isSmallViewport ? '100%' : 'calc(100vw - 8rem)'}
        title="Full-size preview"
      >
        {selectedImage ? (
          <Image
            alt={selectedImage.alt}
            data-testid="history-preview-image"
            fit="contain"
            mah={isSmallViewport ? 'calc(100vh - 10rem)' : 'calc(100vh - 14rem)'}
            src={selectedImage.src}
          />
        ) : null}
      </Modal>
      <Card className="section-card">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={3}>Generated history</Title>
            <Text c="dimmed" size="sm">
              10 items per page
            </Text>
          </Group>

          {!history?.items.length ? (
            <Alert color="gray" title="No history yet">
              Generated and edited jobs will appear here.
            </Alert>
          ) : (
            <Stack gap="sm">
              {history.items.map((item) => {
                const primaryImage = item.images[0];
                const primarySrc = primaryImage
                  ? imageLab.mediaUrl(primaryImage.contentUrl)
                  : null;
                const primaryAlt = primaryImage?.label ?? 'History asset';

                return (
                  <Card key={item.id} className="image-history-card" withBorder>
                    <Stack gap="sm">
                      <Accordion
                        chevronPosition="right"
                        defaultValue={null}
                        variant="separated"
                      >
                        <Accordion.Item value={item.id}>
                          <Accordion.Control data-testid={`history-accordion-${item.id}`}>
                            <Group align="flex-start" gap="md" wrap="nowrap">
                              {primaryImage ? (
                                <Image
                                  alt={primaryAlt}
                                  className="image-history-thumbnail"
                                  data-testid={`history-image-${primaryImage.id}`}
                                  h={88}
                                  radius="md"
                                  src={primarySrc}
                                  w={88}
                                />
                              ) : null}
                              <Stack className="image-history-summary" gap={4}>
                                <Text fw={600} size="sm">
                                  {item.providerId} / {item.model}
                                </Text>
                                <Text c="dimmed" size="sm">
                                  {new Date(item.createdAt).toLocaleString()}
                                </Text>
                                <Text c="dimmed" lineClamp={2} size="sm">
                                  {item.prompt}
                                </Text>
                              </Stack>
                            </Group>
                          </Accordion.Control>
                          <Accordion.Panel>
                            <Stack gap="md">
                              <Stack gap={4}>
                                <Text fw={600} size="sm">
                                  Prompt
                                </Text>
                                <Text size="sm">{item.prompt}</Text>
                                <Button
                                  onClick={async () => {
                                    try {
                                      await copyText(item.prompt);
                                      setCopiedPromptId(item.id);
                                      setCopyError(null);
                                    } catch {
                                      setCopyError(
                                        'Unable to copy the prompt from this browser session.',
                                      );
                                    }
                                  }}
                                  size="compact-sm"
                                  variant="light"
                                >
                                  {copiedPromptId === item.id
                                    ? 'Copied prompt'
                                    : 'Copy prompt to clipboard'}
                                </Button>
                                {copyError ? (
                                  <Alert color="red" title="Copy unavailable">
                                    {copyError}
                                  </Alert>
                                ) : null}
                              </Stack>

                              <Stack gap={4}>
                                <Text fw={600} size="sm">
                                  Reference assets used
                                </Text>
                                <Text c="dimmed" size="sm">
                                  Not captured in the current history payload.
                                </Text>
                              </Stack>

                              <Stack gap={4}>
                                <Text fw={600} size="sm">
                                  Generation options
                                </Text>
                                <Group gap="xs">
                                  <Badge variant="light">{item.mode}</Badge>
                                  <Badge variant="light">{item.providerId}</Badge>
                                  <Badge variant="light">{item.model}</Badge>
                                </Group>
                              </Stack>

                              <Stack gap={4}>
                                <Text fw={600} size="sm">
                                  Provider response / metadata
                                </Text>
                                {item.providerMetadata ||
                                item.images.some((image) => image.providerMetadata) ? (
                                  <Stack gap="xs">
                                    {item.providerMetadata ? (
                                      <MetadataCard
                                        label="Job metadata"
                                        value={item.providerMetadata}
                                      />
                                    ) : null}
                                    {item.images.map((image) =>
                                      image.providerMetadata ? (
                                        <MetadataCard
                                          key={`${image.id}-provider-metadata`}
                                          label={image.label ?? image.id}
                                          value={image.providerMetadata}
                                        />
                                      ) : null,
                                    )}
                                  </Stack>
                                ) : (
                                  <Text c="dimmed" size="sm">
                                    Not captured in the current history payload.
                                  </Text>
                                )}
                              </Stack>

                              <Stack gap="xs">
                                <Text fw={600} size="sm">
                                  Result URL / storage info
                                </Text>
                                {item.images.map((image) => (
                                  <Card key={image.id} className="image-history-detail-card" withBorder>
                                    <Stack gap={4}>
                                      <Text fw={500} size="sm">
                                        {image.label ?? image.id}
                                      </Text>
                                      <Text c="dimmed" size="sm">
                                        Asset ID: {image.id}
                                      </Text>
                                      <Text c="dimmed" size="sm">
                                        Mime type: {image.mimeType}
                                      </Text>
                                      <Text c="dimmed" size="sm">
                                        Source type: {image.sourceType}
                                      </Text>
                                      <Text c="dimmed" size="sm">
                                        Saved: {image.saved ? 'Yes' : 'No'}
                                      </Text>
                                      <Anchor
                                        href={imageLab.mediaUrl(image.contentUrl) ?? image.contentUrl}
                                        size="sm"
                                        target="_blank"
                                      >
                                        Open stored asset
                                      </Anchor>
                                      {image.revisedPrompt ? (
                                        <Text c="dimmed" size="sm">
                                          Revised prompt: {image.revisedPrompt}
                                        </Text>
                                      ) : null}
                                    </Stack>
                                  </Card>
                                ))}
                              </Stack>
                            </Stack>
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>

                      {primaryImage ? (
                        <Group gap="xs">
                          <Button
                            data-testid={`history-use-${primaryImage.id}`}
                            onClick={() => imageLab.addReferenceAsset(primaryImage)}
                            size="compact-sm"
                            variant="light"
                          >
                            Use as reference
                          </Button>
                          <Button
                            data-testid={`history-view-${primaryImage.id}`}
                            onClick={() =>
                              setSelectedImage({
                                src: primarySrc ?? '',
                                alt: primaryAlt,
                              })
                            }
                            size="compact-sm"
                            variant="default"
                          >
                            View full size
                          </Button>
                          <Button
                            onClick={() =>
                              imageLab.saveMutation.mutate({
                                assetId: primaryImage.id,
                                saved: !primaryImage.saved,
                              })
                            }
                            size="compact-sm"
                            variant="default"
                          >
                            {primaryImage.saved ? 'Saved' : 'Save'}
                          </Button>
                        </Group>
                      ) : null}
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          )}

          <Group justify="space-between">
            <Button
              disabled={!history || history.page <= 1}
              onClick={() => imageLab.setHistoryPage((current) => Math.max(1, current - 1))}
              variant="default"
            >
              Previous
            </Button>
            <Text c="dimmed" size="sm">
              Page {history?.page ?? 1} / {history?.totalPages ?? 1}
            </Text>
            <Button
              disabled={!history || history.page >= history.totalPages}
              onClick={() => imageLab.setHistoryPage((current) => current + 1)}
              variant="default"
            >
              Next
            </Button>
          </Group>
        </Stack>
      </Card>
    </>
  );
}

function MetadataCard({
  label,
  value,
}: {
  label: string;
  value: Record<string, unknown>;
}) {
  return (
    <Card className="image-history-detail-card" withBorder>
      <Stack gap={4}>
        <Text fw={500} size="sm">
          {label}
        </Text>
        <Text className="image-history-metadata" component="pre" size="xs">
          {JSON.stringify(value, null, 2)}
        </Text>
      </Stack>
    </Card>
  );
}

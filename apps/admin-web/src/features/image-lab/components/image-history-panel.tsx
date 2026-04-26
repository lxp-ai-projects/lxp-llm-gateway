import {
  Alert,
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
              {history.items.map((item) => (
                <Card key={item.id} withBorder>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={600} size="sm">
                        {item.providerId} / {item.model}
                      </Text>
                      <Text c="dimmed" size="sm">
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    </Group>
                    <Text size="sm">{item.prompt}</Text>
                    <Group>
                      {item.images.map((image) => {
                        const src = imageLab.mediaUrl(image.contentUrl);
                        const alt = image.label ?? 'History asset';

                        return (
                          <Stack key={image.id} gap="xs">
                            <Image
                              alt={alt}
                              data-testid={`history-image-${image.id}`}
                              h={96}
                              onClick={() =>
                                setSelectedImage({
                                  src: src ?? '',
                                  alt,
                                })
                              }
                              radius="md"
                              src={src}
                              style={{ cursor: 'zoom-in' }}
                              w={96}
                            />
                            <Group gap="xs">
                              <Button
                                data-testid={`history-use-${image.id}`}
                                onClick={() => imageLab.addReferenceAsset(image)}
                                size="compact-xs"
                                variant="light"
                              >
                                Use
                              </Button>
                              <Button
                                data-testid={`history-view-${image.id}`}
                                onClick={() =>
                                  setSelectedImage({
                                    src: src ?? '',
                                    alt,
                                  })
                                }
                                size="compact-xs"
                                variant="default"
                              >
                                View full size
                              </Button>
                              <Button
                                onClick={() =>
                                  imageLab.saveMutation.mutate({
                                    assetId: image.id,
                                    saved: !image.saved,
                                  })
                                }
                                size="compact-xs"
                                variant="default"
                              >
                                {image.saved ? 'Saved' : 'Save'}
                              </Button>
                            </Group>
                          </Stack>
                        );
                      })}
                    </Group>
                  </Stack>
                </Card>
              ))}
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

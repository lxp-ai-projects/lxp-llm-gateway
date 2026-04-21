import { Alert, Button, Card, Group, Image, Stack, Text, Title } from '@mantine/core';

import type { ReturnTypeUseImageLab } from '../use-image-lab.types';

export function ImageHistoryPanel({
  imageLab,
}: {
  imageLab: ReturnTypeUseImageLab;
}) {
  const history = imageLab.history;

  return (
    <Card className="section-card">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={3}>History</Title>
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
                    {item.images.map((image) => (
                      <Stack key={image.id} gap="xs">
                        <Image
                          alt={image.label ?? 'History asset'}
                          h={96}
                          radius="md"
                          src={imageLab.mediaUrl(image.contentUrl)}
                          w={96}
                        />
                        <Group gap="xs">
                          <Button
                            onClick={() => imageLab.addReferenceAsset(image)}
                            size="compact-xs"
                            variant="light"
                          >
                            Use
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
                    ))}
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
  );
}

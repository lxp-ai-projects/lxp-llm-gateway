import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import type { GatewayVideoGenerationJob } from '../../../lib/api-client.types';
import type { ReturnTypeUseVideoLab } from '../use-video-lab.types';

export function VideoHistoryPanel({
  videoLab,
}: {
  videoLab: ReturnTypeUseVideoLab;
}) {
  const history = videoLab.historyQuery.data;

  return (
    <Card className="section-card">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Title order={3}>Video history</Title>
          <Text c="dimmed" size="sm">
            10 items per page
          </Text>
        </Group>

        {videoLab.historyQuery.isPending ? (
          <Text c="dimmed" size="sm">
            Loading previous jobs...
          </Text>
        ) : !history?.items.length ? (
          <Alert color="gray" title="No history yet">
            Submitted video jobs will appear here once the pipeline starts.
          </Alert>
        ) : (
          <Stack gap="sm">
            {history.items.map((job) => (
              <Card key={job.id} radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" wrap="wrap">
                    <Stack gap={2}>
                      <Text fw={600} size="sm">
                        {job.providerId} / {job.model}
                      </Text>
                      <Text c="dimmed" size="sm">
                        {new Date(job.createdAt).toLocaleString()}
                      </Text>
                    </Stack>
                    <Group gap="xs">
                      <Badge color={resolveStatusColor(job.status)} variant="light">
                        {job.status}
                      </Badge>
                      <Button
                        onClick={() => videoLab.selectHistoryJob(job)}
                        size="xs"
                        variant="light"
                      >
                        Load in results
                      </Button>
                      <Button
                        disabled={!job.request}
                        loading={videoLab.generateMutation.isPending}
                        onClick={() => void videoLab.retryJob(job)}
                        size="xs"
                        variant="light"
                      >
                        Retry
                      </Button>
                      <Button
                        color="red"
                        disabled={
                          !isTerminalStatus(job.status) ||
                          videoLab.deleteMutation.isPending
                        }
                        loading={videoLab.deleteMutation.isPending}
                        onClick={() => void videoLab.deleteMutation.mutate(job.id)}
                        size="xs"
                        variant="light"
                      >
                        Delete
                      </Button>
                    </Group>
                  </Group>

                  <Text size="sm">{job.prompt}</Text>

                  <Group gap="xs" wrap="wrap">
                    <Badge variant="outline">
                      {job.outputs.length} output{job.outputs.length === 1 ? '' : 's'}
                    </Badge>
                    {job.durationMs ? (
                      <Badge variant="outline">
                        {Math.round(job.durationMs / 1000)}s
                      </Badge>
                    ) : null}
                  </Group>

                  {job.outputs.length ? (
                    job.outputs.map((output, index) => (
                      <Card key={output.assetId ?? `${job.id}-output-${index}`} withBorder>
                        <Stack gap="xs">
                          <Text fw={500} size="sm">
                            Output {index + 1}
                          </Text>
                          {output.contentUrl ? (
                            <video
                              controls
                              preload="metadata"
                              src={videoLab.mediaUrl(output.contentUrl)}
                              style={{ borderRadius: '12px', maxWidth: '100%', width: '100%' }}
                            />
                          ) : (
                            <Text c="dimmed" size="sm">
                              No application asset is available for this output yet.
                            </Text>
                          )}
                        </Stack>
                      </Card>
                    ))
                  ) : (
                    <Text c="dimmed" size="sm">
                      No output has been ingested for this job yet.
                    </Text>
                  )}
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        <Group justify="space-between">
          <Button
            disabled={!history || history.page <= 1}
            onClick={() =>
              videoLab.setHistoryPage((current) => Math.max(1, current - 1))
            }
            variant="default"
          >
            Previous
          </Button>
          <Text c="dimmed" size="sm">
            Page {history?.page ?? 1} / {history?.totalPages ?? 1}
          </Text>
          <Button
            disabled={!history || history.page >= history.totalPages}
            onClick={() => videoLab.setHistoryPage((current) => current + 1)}
            variant="default"
          >
            Next
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function resolveStatusColor(status: GatewayVideoGenerationJob['status']) {
  if (status === 'succeeded') {
    return 'teal';
  }
  if (status === 'failed') {
    return 'red';
  }
  if (status === 'cancelled') {
    return 'yellow';
  }
  return 'blue';
}

function isTerminalStatus(status: GatewayVideoGenerationJob['status']) {
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'cancelled'
  );
}

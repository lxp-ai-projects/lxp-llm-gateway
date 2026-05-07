import {
  Alert,
  Anchor,
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

export function VideoResultsPanel({
  videoLab,
}: {
  videoLab: ReturnTypeUseVideoLab;
}) {
  const job = videoLab.activeJob;

  return (
    <Card className="section-card">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Title order={3}>Current job</Title>
          {job ? (
            <Badge color={resolveStatusColor(job.status)} variant="light">
              {job.status}
            </Badge>
          ) : null}
        </Group>

        {!job ? (
          <Alert color="gray" title="No video job yet">
            Submit a request to create an async video job, then this panel will
            follow the polling and show the ingested result asset.
          </Alert>
        ) : (
          <Stack gap="md">
            <Group gap="xs" wrap="wrap">
              <Badge variant="light">{job.providerId}</Badge>
              <Badge variant="light">{job.model}</Badge>
              <Badge variant="outline">Request {job.requestId}</Badge>
            </Group>

            <Stack gap={4}>
              <Text fw={600} size="sm">
                Prompt
              </Text>
              <Text size="sm">{job.prompt}</Text>
            </Stack>

            <Group gap="md" wrap="wrap">
              <Metric label="Created" value={new Date(job.createdAt).toLocaleString()} />
              <Metric
                label="Completed"
                value={job.completedAt ? new Date(job.completedAt).toLocaleString() : 'Pending'}
              />
              <Metric
                label="Duration"
                value={job.durationMs ? formatDuration(job.durationMs) : 'Pending'}
              />
            </Group>

            {job.status === 'queued' || job.status === 'running' ? (
              <Alert color="blue" title="Polling in progress">
                The gateway is polling this async provider job and will ingest the
                provider artifact into application storage before exposing it here.
              </Alert>
            ) : null}

            {job.status === 'failed' && job.error ? (
              <Alert color="red" title="Generation failed">
                {job.error}
              </Alert>
            ) : null}

            {job.status === 'cancelled' ? (
              <Alert color="yellow" title="Generation cancelled">
                Cancellation is normalized by the gateway and may be best-effort at
                provider level.
              </Alert>
            ) : null}

            {job.status !== 'succeeded' ? (
              <Group>
                <Button
                  disabled={
                    videoLab.cancelMutation.isPending ||
                    job.status === 'failed' ||
                    job.status === 'cancelled'
                  }
                  loading={videoLab.cancelMutation.isPending}
                  onClick={() => videoLab.cancelMutation.mutate(job.id)}
                  variant="default"
                >
                  Cancel job
                </Button>
              </Group>
            ) : null}

            {!job.outputs.length ? (
              <Text c="dimmed" size="sm">
                No ingested output is available yet.
              </Text>
            ) : (
              job.outputs.map((output, index) => (
                <Card key={output.assetId ?? `${job.id}-${index}`} radius="md" withBorder>
                  <Stack gap="sm">
                    <Text fw={600} size="sm">
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
                      <Alert color="yellow" title="Preview unavailable">
                        The job succeeded, but this output is missing an application
                        asset URL.
                      </Alert>
                    )}
                    <Group gap="md" wrap="wrap">
                      <Metric
                        label="Resolution"
                        value={
                          output.width && output.height
                            ? `${output.width} x ${output.height}`
                            : 'Unknown'
                        }
                      />
                      <Metric
                        label="Duration"
                        value={
                          typeof output.durationSeconds === 'number'
                            ? `${output.durationSeconds}s`
                            : 'Unknown'
                        }
                      />
                      <Metric
                        label="Size"
                        value={
                          typeof output.byteSize === 'number'
                            ? formatBytes(output.byteSize)
                            : 'Unknown'
                        }
                      />
                    </Group>
                    {output.contentUrl ? (
                      <Anchor
                        href={videoLab.mediaUrl(output.contentUrl)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open application asset
                      </Anchor>
                    ) : null}
                  </Stack>
                </Card>
              ))
            )}
          </Stack>
        )}
      </Stack>
    </Card>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Stack gap={2}>
      <Text c="dimmed" size="xs" tt="uppercase">
        {label}
      </Text>
      <Text fw={600} size="sm">
        {value}
      </Text>
    </Stack>
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

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function formatBytes(byteSize: number) {
  if (byteSize < 1024) {
    return `${byteSize} B`;
  }
  if (byteSize < 1024 * 1024) {
    return `${(byteSize / 1024).toFixed(1)} KB`;
  }
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

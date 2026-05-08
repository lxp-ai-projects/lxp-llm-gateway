import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Loader,
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
  const isTerminal = job ? isTerminalStatus(job.status) : false;
  const pollingEnabled = Boolean(job && !isTerminal);
  const isPollingNow = pollingEnabled && videoLab.activeJobQuery.isFetching;
  const providerState = job ? describeProviderState(job.status) : null;
  const providerDiagnostics =
    job && job.providerMetadata ? buildProviderDiagnostics(job.providerMetadata) : [];

  return (
    <Card className="section-card">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Title order={3}>Current job</Title>
          {job ? (
            <Group gap="xs">
              {pollingEnabled ? (
                <Badge
                  color={isPollingNow ? 'cyan' : 'blue'}
                  variant={isPollingNow ? 'filled' : 'light'}
                >
                  {isPollingNow ? 'Polling now' : 'Polling armed'}
                </Badge>
              ) : null}
              <Badge color={resolveStatusColor(job.status)} variant="light">
                {job.status}
              </Badge>
            </Group>
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

            {providerState ? (
              <Alert
                color={providerState.color}
                title={providerState.title}
                variant="light"
              >
                <Group align="flex-start" gap="sm" wrap="nowrap">
                  {pollingEnabled ? <Loader color={providerState.loaderColor} size="sm" /> : null}
                  <Text size="sm">{providerState.message}</Text>
                </Group>
              </Alert>
            ) : null}

            <Stack gap={4}>
              <Text fw={600} size="sm">
                Prompt
              </Text>
              <Text size="sm">{job.prompt}</Text>
            </Stack>

            <Group gap="md" wrap="wrap">
              <Metric label="State" value={formatJobStatus(job.status)} />
              <Metric label="Created" value={new Date(job.createdAt).toLocaleString()} />
              <Metric
                label="Started"
                value={job.startedAt ? new Date(job.startedAt).toLocaleString() : 'Not started yet'}
              />
              <Metric
                label="Completed"
                value={job.completedAt ? new Date(job.completedAt).toLocaleString() : 'Pending'}
              />
              <Metric
                label="Duration"
                value={job.durationMs ? formatDuration(job.durationMs) : 'Pending'}
              />
            </Group>

            {providerDiagnostics.length ? (
              <Card padding="sm" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" wrap="wrap">
                    <Text fw={600} size="sm">
                      Provider diagnostics
                    </Text>
                    <Badge variant="light">
                      {formatProviderName(job.providerId)}
                    </Badge>
                  </Group>
                  <Group gap="md" wrap="wrap">
                    {providerDiagnostics.map((diagnostic) => (
                      <Metric
                        key={diagnostic.label}
                        label={diagnostic.label}
                        value={diagnostic.value}
                      />
                    ))}
                  </Group>
                </Stack>
              </Card>
            ) : null}

            {job.request || job.providerMetadata ? (
              <Card padding="sm" radius="md" withBorder>
                <Stack gap="sm">
                  <Text fw={600} size="sm">
                    Debug payloads
                  </Text>
                  <Text c="dimmed" size="sm">
                    Gateway snapshot plus normalized provider metadata for troubleshooting.
                  </Text>
                  {job.request ? (
                    <Stack gap={4}>
                      <Text fw={500} size="sm">
                        Gateway request snapshot
                      </Text>
                      <Code block>{formatDebugJson(job.request)}</Code>
                    </Stack>
                  ) : null}
                  {job.providerMetadata ? (
                    <Stack gap={4}>
                      <Text fw={500} size="sm">
                        Provider metadata
                      </Text>
                      <Code block>{formatDebugJson(job.providerMetadata)}</Code>
                    </Stack>
                  ) : null}
                </Stack>
              </Card>
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
                <Button
                  disabled={!job.request}
                  loading={videoLab.generateMutation.isPending}
                  onClick={() => void videoLab.retryJob(job)}
                  variant="light"
                >
                  Retry
                </Button>
                <Button
                  color="red"
                  disabled={!isTerminal || videoLab.deleteMutation.isPending}
                  loading={videoLab.deleteMutation.isPending}
                  onClick={() => void videoLab.deleteMutation.mutate(job.id)}
                  variant="light"
                >
                  Delete job
                </Button>
              </Group>
            ) : (
              <Group>
                <Button
                  disabled={!job.request}
                  loading={videoLab.generateMutation.isPending}
                  onClick={() => void videoLab.retryJob(job)}
                  variant="light"
                >
                  Retry
                </Button>
                <Button
                  color="red"
                  disabled={videoLab.deleteMutation.isPending}
                  loading={videoLab.deleteMutation.isPending}
                  onClick={() => void videoLab.deleteMutation.mutate(job.id)}
                  variant="light"
                >
                  Delete job
                </Button>
              </Group>
            )}

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

function isTerminalStatus(status: GatewayVideoGenerationJob['status']) {
  return (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'cancelled'
  );
}

function formatJobStatus(status: GatewayVideoGenerationJob['status']) {
  if (status === 'queued') {
    return 'Queued';
  }
  if (status === 'running') {
    return 'Rendering';
  }
  if (status === 'succeeded') {
    return 'Succeeded';
  }
  if (status === 'failed') {
    return 'Failed';
  }
  return 'Cancelled';
}

function describeProviderState(status: GatewayVideoGenerationJob['status']) {
  if (status === 'queued') {
    return {
      title: 'Queued at provider',
      message:
        'The gateway submitted the job successfully, but the provider has not started rendering yet. The gateway will keep polling until the job starts or finishes.',
      color: 'blue',
      loaderColor: 'blue',
    } as const;
  }

  if (status === 'running') {
    return {
      title: 'Generation in progress',
      message:
        'The provider is actively rendering the video. The result will appear here after the gateway ingests the provider artifact into application storage.',
      color: 'teal',
      loaderColor: 'teal',
    } as const;
  }

  if (status === 'succeeded') {
    return {
      title: 'Generation completed',
      message:
        'The provider job completed and the gateway has an ingested application-owned asset available below.',
      color: 'teal',
      loaderColor: 'teal',
    } as const;
  }

  if (status === 'failed') {
    return {
      title: 'Generation failed',
      message:
        'The provider job reached a terminal failure state. Review the error details below before retrying.',
      color: 'red',
      loaderColor: 'red',
    } as const;
  }

  if (status === 'cancelled') {
    return {
      title: 'Generation cancelled',
      message:
        'The gateway marked this job as cancelled. Provider-side cancellation may be best-effort depending on upstream support.',
      color: 'yellow',
      loaderColor: 'yellow',
    } as const;
  }

  return null;
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

function buildProviderDiagnostics(metadata: Record<string, unknown>) {
  const diagnostics: Array<{ label: string; value: string }> = [];
  const credentialScopeUsed = readString(metadata.credentialScopeUsed);
  const upstreamStatus = readString(metadata.upstreamStatus);
  const providerJobId = readString(metadata.id);
  const generationId = readString(metadata.generationId);
  const pollingUrl = readString(metadata.pollingUrl);
  const usage = readRecord(metadata.usage);
  const cost = usage ? readNumber(usage.cost) : undefined;

  if (credentialScopeUsed) {
    diagnostics.push({ label: 'Credential scope', value: credentialScopeUsed });
  }
  if (upstreamStatus) {
    diagnostics.push({ label: 'Upstream status', value: upstreamStatus });
  }
  if (providerJobId) {
    diagnostics.push({ label: 'Provider job id', value: providerJobId });
  }
  if (generationId) {
    diagnostics.push({ label: 'Generation id', value: generationId });
  }
  if (typeof cost === 'number') {
    diagnostics.push({ label: 'Reported cost', value: `$${cost.toFixed(4)}` });
  }
  if (pollingUrl) {
    diagnostics.push({ label: 'Polling URL', value: pollingUrl });
  }

  return diagnostics;
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function formatProviderName(providerId: string) {
  if (providerId === 'openrouter') {
    return 'OpenRouter';
  }

  return providerId;
}

function formatDebugJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

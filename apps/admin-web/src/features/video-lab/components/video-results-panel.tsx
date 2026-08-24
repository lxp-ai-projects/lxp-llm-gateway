import { useTranslation } from 'react-i18next';
import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Progress,
  Stack,
  Text,
  Title,
} from '@mantine/core';

import type { GatewayVideoGenerationJob } from '../../../lib/api-client.types';
import { formatDateTime } from '../../../i18n/format';
import type { ReturnTypeUseVideoLab } from '../use-video-lab.types';

export function VideoResultsPanel({
  videoLab,
}: {
  videoLab: ReturnTypeUseVideoLab;
}) {
  const { t } = useTranslation('video');
  const job = videoLab.activeJob;
  const isTerminal = job ? isTerminalStatus(job.status) : false;
  const pollingEnabled = Boolean(job && !isTerminal);
  const isPollingNow = pollingEnabled && videoLab.activeJobQuery.isFetching;
  const providerState = job ? describeProviderState(job.status) : null;
  const providerDiagnostics =
    job && job.providerMetadata
      ? buildProviderDiagnostics(job.providerMetadata)
      : [];

  return (
    <Card className="section-card">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Title order={3}>{t('videoResultsPanel.currentJob')}</Title>
          {job ? (
            <Group gap="xs">
              {pollingEnabled ? (
                <Badge
                  color={isPollingNow ? 'cyan' : 'blue'}
                  variant={isPollingNow ? 'filled' : 'light'}
                >
                  {isPollingNow
                    ? t('videoResultsPanel.pollingNow')
                    : t('videoResultsPanel.pollingArmed')}
                </Badge>
              ) : null}
              <Badge color={resolveStatusColor(job.status)} variant="light">
                {t(`videoResultsPanel.status.${job.status}`)}
              </Badge>
            </Group>
          ) : null}
        </Group>

        {!job ? (
          <Alert color="gray" title={t('videoResultsPanel.noVideoJobYet')}>
            {t('videoResultsPanel.submitARequestToCreateAnAsync')}
          </Alert>
        ) : (
          <Stack gap="md">
            <Group gap="xs" wrap="wrap">
              <Badge variant="light">{job.providerId}</Badge>
              <Badge variant="light">{job.model}</Badge>
              <Badge variant="outline">
                {t('videoResultsPanel.requestValue', {
                  request: job.requestId,
                })}
              </Badge>
            </Group>

            {providerState ? (
              <Alert
                color={providerState.color}
                title={t(providerState.titleKey)}
                variant="light"
              >
                <Group align="flex-start" gap="sm" wrap="nowrap">
                  {pollingEnabled ? (
                    <Loader color={providerState.loaderColor} size="sm" />
                  ) : null}
                  <Text size="sm">{t(providerState.messageKey)}</Text>
                </Group>
              </Alert>
            ) : null}

            <Stack gap={4}>
              <Text fw={600} size="sm">
                {t('videoResultsPanel.prompt')}
              </Text>
              <Text size="sm">{job.prompt}</Text>
            </Stack>

            <Group gap="md" wrap="wrap">
              <Metric
                label={t('videoResultsPanel.state')}
                value={t(`videoResultsPanel.status.${job.status}`)}
              />
              <Metric
                label={t('videoResultsPanel.created')}
                value={formatDateTime(job.createdAt)}
              />
              <Metric
                label={t('videoResultsPanel.started')}
                value={
                  job.startedAt
                    ? formatDateTime(job.startedAt)
                    : t('videoResultsPanel.notStartedYet')
                }
              />
              <Metric
                label={t('videoResultsPanel.completed')}
                value={
                  job.completedAt
                    ? formatDateTime(job.completedAt)
                    : t('videoResultsPanel.pending')
                }
              />
              <Metric
                label={t('videoResultsPanel.duration')}
                value={
                  job.durationMs
                    ? formatDuration(job.durationMs)
                    : t('videoResultsPanel.pending')
                }
              />
            </Group>

            {pollingEnabled ? (
              <Card padding="sm" radius="md" withBorder>
                <Stack gap="sm">
                  <Group gap="md" grow>
                    <Metric
                      label={t('videoResultsPanel.elapsed')}
                      value={formatClockDuration(
                        videoLab.currentRenderElapsedMs,
                      )}
                    />
                    <Metric
                      label={t('videoResultsPanel.estimated')}
                      value={
                        videoLab.estimatedRenderDurationMs
                          ? formatClockDuration(
                              videoLab.estimatedRenderDurationMs,
                            )
                          : t('videoResultsPanel.calculating')
                      }
                    />
                  </Group>
                  {videoLab.currentRenderProgressPercent !== null ? (
                    <Stack gap={4}>
                      <Progress
                        aria-label={t(
                          'videoResultsPanel.videoRenderingProgress',
                        )}
                        radius="xl"
                        size="md"
                        value={videoLab.currentRenderProgressPercent}
                      />
                      <Text c="dimmed" size="xs">
                        {t('videoResultsPanel.estimateSummary', {
                          count: videoLab.estimatedRenderSampleSize,
                        })}
                      </Text>
                    </Stack>
                  ) : (
                    <Text c="dimmed" size="xs">
                      {t(
                        'videoResultsPanel.estimationWillAppearAfterAFewCompleted',
                      )}
                    </Text>
                  )}
                </Stack>
              </Card>
            ) : null}

            {providerDiagnostics.length ? (
              <Card padding="sm" radius="md" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between" wrap="wrap">
                    <Text fw={600} size="sm">
                      {t('videoResultsPanel.providerDiagnostics')}
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
                <Accordion
                  chevronPosition="right"
                  defaultValue={null}
                  variant="separated"
                >
                  <Accordion.Item value="debug-payloads">
                    <Accordion.Control>
                      <Stack gap={2}>
                        <Text fw={600} size="sm">
                          {t('videoResultsPanel.debugPayloads')}
                        </Text>
                        <Text c="dimmed" size="sm">
                          {t(
                            'videoResultsPanel.gatewaySnapshotPlusNormalizedProviderMetadataFor',
                          )}
                        </Text>
                      </Stack>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        {job.request ? (
                          <Stack gap={4}>
                            <Text fw={500} size="sm">
                              {t('videoResultsPanel.gatewayRequestSnapshot')}
                            </Text>
                            <Code block>{formatDebugJson(job.request)}</Code>
                          </Stack>
                        ) : null}
                        {job.providerMetadata ? (
                          <Stack gap={4}>
                            <Text fw={500} size="sm">
                              {t('videoResultsPanel.providerMetadata')}
                            </Text>
                            <Code block>
                              {formatDebugJson(job.providerMetadata)}
                            </Code>
                          </Stack>
                        ) : null}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>
              </Card>
            ) : null}

            {job.status === 'failed' && job.error ? (
              <Alert
                color="red"
                title={t('videoResultsPanel.generationFailed')}
              >
                {job.error}
              </Alert>
            ) : null}

            {job.status === 'cancelled' ? (
              <Alert
                color="yellow"
                title={t('videoResultsPanel.generationCancelled')}
              >
                {t('videoResultsPanel.cancellationIsNormalizedByTheGatewayAnd')}
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
                  {t('videoResultsPanel.cancelJob')}
                </Button>
                <Button
                  disabled={!job.request}
                  loading={videoLab.generateMutation.isPending}
                  onClick={() => void videoLab.retryJob(job)}
                  variant="light"
                >
                  {t('videoResultsPanel.retry')}
                </Button>
                <Button
                  color="red"
                  disabled={!isTerminal || videoLab.deleteMutation.isPending}
                  loading={videoLab.deleteMutation.isPending}
                  onClick={() => void videoLab.deleteMutation.mutate(job.id)}
                  variant="light"
                >
                  {t('videoResultsPanel.deleteJob')}
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
                  {t('videoResultsPanel.retry')}
                </Button>
                <Button
                  color="red"
                  disabled={videoLab.deleteMutation.isPending}
                  loading={videoLab.deleteMutation.isPending}
                  onClick={() => void videoLab.deleteMutation.mutate(job.id)}
                  variant="light"
                >
                  {t('videoResultsPanel.deleteJob')}
                </Button>
              </Group>
            )}

            {!job.outputs.length ? (
              <Text c="dimmed" size="sm">
                {t('videoResultsPanel.noIngestedOutputIsAvailableYet')}
              </Text>
            ) : (
              job.outputs.map((output, index) => (
                <Card
                  key={output.assetId ?? `${job.id}-${index}`}
                  radius="md"
                  withBorder
                >
                  <Stack gap="sm">
                    <Text fw={600} size="sm">
                      {t('videoResultsPanel.outputValue', { index: index + 1 })}
                    </Text>
                    {output.contentUrl ? (
                      <video
                        controls
                        preload="metadata"
                        src={videoLab.mediaUrl(output.contentUrl)}
                        style={{
                          borderRadius: '12px',
                          maxWidth: '100%',
                          width: '100%',
                        }}
                      />
                    ) : (
                      <Alert
                        color="yellow"
                        title={t('videoResultsPanel.previewUnavailable')}
                      >
                        {t('videoResultsPanel.theJobSucceededButThisOutputIs')}
                      </Alert>
                    )}
                    <Group gap="md" wrap="wrap">
                      <Metric
                        label={t('videoResultsPanel.resolution')}
                        value={
                          output.width && output.height
                            ? `${output.width} x ${output.height}`
                            : 'Unknown'
                        }
                      />
                      <Metric
                        label={t('videoResultsPanel.duration')}
                        value={
                          typeof output.durationSeconds === 'number'
                            ? `${output.durationSeconds}s`
                            : 'Unknown'
                        }
                      />
                      <Metric
                        label={t('videoResultsPanel.size')}
                        value={
                          typeof output.byteSize === 'number'
                            ? formatBytes(output.byteSize)
                            : 'Unknown'
                        }
                      />
                    </Group>
                    <Group gap="sm">
                      {output.assetId ? (
                        <Button
                          loading={videoLab.saveAssetMutation.isPending}
                          onClick={() => {
                            const assetId = output.assetId;
                            if (!assetId) {
                              return;
                            }

                            videoLab.saveAssetMutation.mutate({
                              assetId,
                              saved: !output.saved,
                            });
                          }}
                          size="xs"
                          variant={output.saved ? 'filled' : 'light'}
                        >
                          {output.saved
                            ? t('videoResultsPanel.savedAction')
                            : t('videoResultsPanel.saveAction')}
                        </Button>
                      ) : null}
                      {output.contentUrl ? (
                        <Anchor
                          href={videoLab.mediaUrl(output.contentUrl)}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {t('videoResultsPanel.openApplicationAsset')}
                        </Anchor>
                      ) : null}
                    </Group>
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

function Metric({ label, value }: { label: string; value: string }) {
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
    status === 'succeeded' || status === 'failed' || status === 'cancelled'
  );
}

function describeProviderState(status: GatewayVideoGenerationJob['status']) {
  if (status === 'queued') {
    return {
      titleKey: 'videoResultsPanel.providerState.queuedTitle',
      messageKey: 'videoResultsPanel.providerState.queuedMessage',
      color: 'blue',
      loaderColor: 'blue',
    } as const;
  }

  if (status === 'running') {
    return {
      titleKey: 'videoResultsPanel.providerState.runningTitle',
      messageKey: 'videoResultsPanel.providerState.runningMessage',
      color: 'teal',
      loaderColor: 'teal',
    } as const;
  }

  if (status === 'succeeded') {
    return {
      titleKey: 'videoResultsPanel.providerState.succeededTitle',
      messageKey: 'videoResultsPanel.providerState.succeededMessage',
      color: 'teal',
      loaderColor: 'teal',
    } as const;
  }

  if (status === 'failed') {
    return {
      titleKey: 'videoResultsPanel.providerState.failedTitle',
      messageKey: 'videoResultsPanel.providerState.failedMessage',
      color: 'red',
      loaderColor: 'red',
    } as const;
  }

  if (status === 'cancelled') {
    return {
      titleKey: 'videoResultsPanel.providerState.cancelledTitle',
      messageKey: 'videoResultsPanel.providerState.cancelledMessage',
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

function formatClockDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
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
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
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

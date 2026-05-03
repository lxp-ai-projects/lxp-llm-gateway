import { useQuery } from '@tanstack/react-query';
import {
  ActionIcon,
  Alert,
  Card,
  Grid,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconChartBarPopular, IconHelpCircle } from '@tabler/icons-react';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';
import { adminApiClient } from '../lib/admin-api-client';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useSession } from '../lib/use-session';

function formatWholeNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function formatUsd(value: string | null | undefined) {
  const amount = Number(value ?? '0');
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

function HelpTooltip({
  text,
}: {
  text: string;
}) {
  return (
    <Tooltip label={text} multiline w={280} withArrow>
      <ActionIcon
        aria-label="More information"
        color="gray"
        radius="xl"
        size="sm"
        variant="subtle"
      >
        <IconHelpCircle size={14} />
      </ActionIcon>
    </Tooltip>
  );
}

function SectionTitle({
  title,
  help,
}: {
  title: string;
  help: string;
}) {
  return (
    <Group justify="space-between" align="center">
      <Text fw={700}>{title}</Text>
      <HelpTooltip text={help} />
    </Group>
  );
}

export function AnalyticsPage() {
  const sessionQuery = useSession();
  const activeTenantId = sessionQuery.data?.activeTenantId ?? null;

  const usageSummaryQuery = useQuery({
    queryKey: ['tenant-usage-summary', activeTenantId],
    queryFn: () => adminApiClient.getTenantUsageSummary(activeTenantId!),
    enabled: activeTenantId !== null,
  });
  const usageByProviderQuery = useQuery({
    queryKey: ['tenant-usage-by-provider', activeTenantId],
    queryFn: () => adminApiClient.getTenantUsageByProvider(activeTenantId!),
    enabled: activeTenantId !== null,
  });
  const usageByModelQuery = useQuery({
    queryKey: ['tenant-usage-by-model', activeTenantId],
    queryFn: () => adminApiClient.getTenantUsageByModel(activeTenantId!),
    enabled: activeTenantId !== null,
  });

  const isLoading =
    usageSummaryQuery.isLoading ||
    usageByProviderQuery.isLoading ||
    usageByModelQuery.isLoading;
  const hasError =
    usageSummaryQuery.isError ||
    usageByProviderQuery.isError ||
    usageByModelQuery.isError;

  return (
    <>
      <PageHeader
        title="Gateway Analytics"
        description="Tenant analytics now read from the durable usage ledger to show current activity, policy blocks, and provider/model concentration."
        context={getActiveTenantLabel(sessionQuery.data)}
      />
      <Grid>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label="Active users / 30d"
            value={formatWholeNumber(usageSummaryQuery.data?.activeUsers30d)}
            description="Unique users who generated usage in the last 30 days."
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label="Distinct gateway users / 24h"
            value={formatWholeNumber(usageSummaryQuery.data?.distinctUsers24h)}
            description="Unique users seen in the last 24 hours."
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label="Gateway requests / 7d"
            value={formatWholeNumber(usageSummaryQuery.data?.requests7d)}
            description="Total requests accepted or blocked by the gateway over 7 days."
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label="Blocked requests / 7d"
            tone={
              (usageSummaryQuery.data?.blockedRequests7d ?? 0) > 0
                ? 'warning'
                : 'good'
            }
            value={formatWholeNumber(usageSummaryQuery.data?.blockedRequests7d)}
            description="Requests refused by policy, quota, or other gateway guardrails."
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label="Estimated cost / 30d"
            value={formatUsd(usageSummaryQuery.data?.estimatedCostUsd30d)}
            description="Approximate spend based on recorded usage events and provider cost estimation."
          />
        </Grid.Col>
      </Grid>

      <Text c="dimmed" size="sm" mt="md">
        The usage ledger groups requests by tenant, provider, and model. Policy
        or quota blocks are counted separately so you can see when the gateway
        intentionally refused a request.
      </Text>

      {isLoading ? (
        <Alert
          color="blue"
          icon={<Loader size={16} />}
          mt="lg"
          title="Loading analytics"
        >
          The usage ledger is being aggregated for the active tenant.
        </Alert>
      ) : null}

      {hasError ? (
        <Alert
          color="red"
          icon={<IconChartBarPopular size={18} />}
          mt="lg"
          title="Analytics unavailable"
        >
          The control plane could not load tenant analytics from the usage
          ledger.
        </Alert>
      ) : null}

      {!isLoading && !hasError ? (
        <Grid mt="md">
          <Grid.Col span={{ base: 12, xl: 6 }}>
            <Card>
              <Stack gap="sm">
                <SectionTitle
                  title="Usage by provider"
                  help="Breaks activity down by provider so you can see where traffic, cost, and blocks concentrate."
                />
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Provider</Table.Th>
                      <Table.Th>Requests / 30d</Table.Th>
                      <Table.Th>Blocked / 30d</Table.Th>
                      <Table.Th>Estimated cost / 30d</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(usageByProviderQuery.data ?? []).map((row) => (
                      <Table.Tr key={row.providerId}>
                        <Table.Td>{row.providerId}</Table.Td>
                        <Table.Td>{formatWholeNumber(row.requests30d)}</Table.Td>
                        <Table.Td>
                          {formatWholeNumber(row.blockedRequests30d)}
                        </Table.Td>
                        <Table.Td>{formatUsd(row.estimatedCostUsd30d)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, xl: 6 }}>
            <Card>
              <Stack gap="sm">
                <SectionTitle
                  title="Usage by model"
                  help="Shows which specific models are being used within each provider and how much activity each model receives."
                />
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Provider</Table.Th>
                      <Table.Th>Model</Table.Th>
                      <Table.Th>Capability</Table.Th>
                      <Table.Th>Requests / 30d</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(usageByModelQuery.data ?? []).map((row) => (
                      <Table.Tr key={`${row.providerId}:${row.model}`}>
                        <Table.Td>{row.providerId}</Table.Td>
                        <Table.Td>{row.model}</Table.Td>
                        <Table.Td>{row.capability ?? 'unknown'}</Table.Td>
                        <Table.Td>{formatWholeNumber(row.requests30d)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      ) : null}
    </>
  );
}

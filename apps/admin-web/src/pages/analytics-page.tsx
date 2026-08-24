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
import { useTranslation } from 'react-i18next';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';
import { adminApiClient } from '../lib/admin-api-client';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useSession } from '../lib/use-session';
import { formatNumber } from '../i18n/format';

function formatWholeNumber(value: number | null | undefined) {
  return formatNumber(value ?? 0);
}

function formatUsd(value: string | null | undefined) {
  const amount = Number(value ?? '0');
  return formatNumber(amount, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function HelpTooltip({ text }: { text: string }) {
  const { t } = useTranslation('analytics');
  return (
    <Tooltip label={text} multiline w={280} withArrow>
      <ActionIcon
        aria-label={t('moreInformation')}
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

function SectionTitle({ title, help }: { title: string; help: string }) {
  return (
    <Group justify="space-between" align="center">
      <Text fw={700}>{title}</Text>
      <HelpTooltip text={help} />
    </Group>
  );
}

export function AnalyticsPage() {
  const { t } = useTranslation('analytics');
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
        title={t('title')}
        description={t('description')}
        context={getActiveTenantLabel(sessionQuery.data)}
      />
      <Grid>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label={t('tiles.activeUsers.label')}
            value={formatWholeNumber(usageSummaryQuery.data?.activeUsers30d)}
            description={t('tiles.activeUsers.description')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label={t('tiles.distinctUsers.label')}
            value={formatWholeNumber(usageSummaryQuery.data?.distinctUsers24h)}
            description={t('tiles.distinctUsers.description')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label={t('tiles.requests.label')}
            value={formatWholeNumber(usageSummaryQuery.data?.requests7d)}
            description={t('tiles.requests.description')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label={t('tiles.blocked.label')}
            tone={
              (usageSummaryQuery.data?.blockedRequests7d ?? 0) > 0
                ? 'warning'
                : 'good'
            }
            value={formatWholeNumber(usageSummaryQuery.data?.blockedRequests7d)}
            description={t('tiles.blocked.description')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label={t('tiles.cost.label')}
            value={formatUsd(usageSummaryQuery.data?.estimatedCostUsd30d)}
            description={t('tiles.cost.description')}
          />
        </Grid.Col>
      </Grid>

      <Text c="dimmed" size="sm" mt="md">
        {t('ledgerDescription')}
      </Text>

      {isLoading ? (
        <Alert
          color="blue"
          icon={<Loader size={16} />}
          mt="lg"
          title={t('loading.title')}
        >
          {t('loading.description')}
        </Alert>
      ) : null}

      {hasError ? (
        <Alert
          color="red"
          icon={<IconChartBarPopular size={18} />}
          mt="lg"
          title={t('error.title')}
        >
          {t('error.description')}
        </Alert>
      ) : null}

      {!isLoading && !hasError ? (
        <Grid mt="md">
          <Grid.Col span={{ base: 12, xl: 6 }}>
            <Card>
              <Stack gap="sm">
                <SectionTitle
                  title={t('provider.title')}
                  help={t('provider.help')}
                />
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('columns.provider')}</Table.Th>
                      <Table.Th>{t('columns.requests')}</Table.Th>
                      <Table.Th>{t('columns.blocked')}</Table.Th>
                      <Table.Th>{t('columns.cost')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(usageByProviderQuery.data ?? []).map((row) => (
                      <Table.Tr key={row.providerId}>
                        <Table.Td>{row.providerId}</Table.Td>
                        <Table.Td>
                          {formatWholeNumber(row.requests30d)}
                        </Table.Td>
                        <Table.Td>
                          {formatWholeNumber(row.blockedRequests30d)}
                        </Table.Td>
                        <Table.Td>
                          {formatUsd(row.estimatedCostUsd30d)}
                        </Table.Td>
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
                <SectionTitle title={t('model.title')} help={t('model.help')} />
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('columns.provider')}</Table.Th>
                      <Table.Th>{t('columns.model')}</Table.Th>
                      <Table.Th>{t('columns.capability')}</Table.Th>
                      <Table.Th>{t('columns.requests')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {(usageByModelQuery.data ?? []).map((row) => (
                      <Table.Tr key={`${row.providerId}:${row.model}`}>
                        <Table.Td>{row.providerId}</Table.Td>
                        <Table.Td>{row.model}</Table.Td>
                        <Table.Td>
                          {row.capability ?? t('columns.unknown')}
                        </Table.Td>
                        <Table.Td>
                          {formatWholeNumber(row.requests30d)}
                        </Table.Td>
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

import { Grid } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';
import { adminApiClient, gatewayApiClient } from '../lib/api-client';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useSession } from '../lib/use-session';

export function HealthPage() {
  const { t } = useTranslation('pages');
  const sessionQuery = useSession();
  const adminHealthQuery = useQuery({
    queryKey: ['admin-api-health'],
    queryFn: () => adminApiClient.getHealth(),
  });
  const gatewayHealthQuery = useQuery({
    queryKey: ['gateway-api-health'],
    queryFn: () => gatewayApiClient.getHealth(),
  });

  return (
    <>
      <PageHeader
        title={t('health.title')}
        description={t('health.description')}
        context={getActiveTenantLabel(sessionQuery.data)}
      />
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <StatusTile
            label="admin-api"
            tone={adminHealthQuery.data?.status === 'ok' ? 'good' : 'warning'}
            value={
              adminHealthQuery.isPending
                ? t('health.checking')
                : adminHealthQuery.isError
                  ? t('health.unavailable')
                  : (adminHealthQuery.data?.status ?? t('health.unknown'))
            }
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <StatusTile
            label="gateway-api"
            tone={gatewayHealthQuery.data?.status === 'ok' ? 'good' : 'warning'}
            value={
              gatewayHealthQuery.isPending
                ? t('health.checking')
                : gatewayHealthQuery.isError
                  ? t('health.unavailable')
                  : (gatewayHealthQuery.data?.status ?? t('health.unknown'))
            }
          />
        </Grid.Col>
      </Grid>
    </>
  );
}

import { Grid } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';
import { adminApiClient, gatewayApiClient } from '../lib/api-client';

export function HealthPage() {
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
        title="Health"
        description="Operational status view for the two initial planes exposed by the platform."
      />
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <StatusTile
            label="admin-api"
            tone={adminHealthQuery.data?.status === 'ok' ? 'good' : 'warning'}
            value={
              adminHealthQuery.isPending
                ? 'Checking...'
                : adminHealthQuery.isError
                  ? 'Unavailable'
                  : adminHealthQuery.data?.status ?? 'Unknown'
            }
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <StatusTile
            label="gateway-api"
            tone={gatewayHealthQuery.data?.status === 'ok' ? 'good' : 'warning'}
            value={
              gatewayHealthQuery.isPending
                ? 'Checking...'
                : gatewayHealthQuery.isError
                  ? 'Unavailable'
                  : gatewayHealthQuery.data?.status ?? 'Unknown'
            }
          />
        </Grid.Col>
      </Grid>
    </>
  );
}

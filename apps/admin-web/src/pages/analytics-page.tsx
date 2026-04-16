import { Alert, Grid } from '@mantine/core';
import { IconChartBarPopular } from '@tabler/icons-react';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';

export function AnalyticsPage() {
  return (
    <>
      <PageHeader
        title="Gateway Analytics"
        description="Phase 1 analytics focuses on adoption, activity, and gateway availability rather than deep BI."
      />
      <Grid>
        <Grid.Col span={{ base: 12, md: 6, xl: 4 }}>
          <StatusTile label="Active users" value="Pending backend endpoint" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 4 }}>
          <StatusTile label="Distinct gateway users / 24h" value="Pending backend endpoint" />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 4 }}>
          <StatusTile label="Gateway requests / 7d" value="Pending backend endpoint" />
        </Grid.Col>
      </Grid>
      <Alert color="blue" icon={<IconChartBarPopular size={18} />} mt="lg" title="Backend dependency">
        The SPA shell is ready for these analytics surfaces, but the dedicated admin analytics endpoints
        still need to be exposed by `admin-api`.
      </Alert>
    </>
  );
}

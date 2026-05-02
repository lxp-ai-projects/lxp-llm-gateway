import { Alert, Grid } from '@mantine/core';
import { IconUserCog } from '@tabler/icons-react';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useSession } from '../lib/use-session';

export function ProfilePage() {
  const sessionQuery = useSession();

  return (
    <>
      <PageHeader
        title="Profile"
        description="Self-service account management, with server-owned auth and future analytics stitched into the same surface."
        context={getActiveTenantLabel(sessionQuery.data)}
      />
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <StatusTile
            label="Display name"
            value={sessionQuery.data?.displayName ?? 'Unavailable'}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <StatusTile
            label="Email"
            value={sessionQuery.data?.email ?? 'Unavailable'}
          />
        </Grid.Col>
      </Grid>
      <Alert
        color="blue"
        icon={<IconUserCog size={18} />}
        mt="lg"
        title="Phase 1 placeholder"
      >
        Profile editing, password change, and per-user analytics cards should be
        connected once the supporting backend endpoints are finalized.
      </Alert>
    </>
  );
}

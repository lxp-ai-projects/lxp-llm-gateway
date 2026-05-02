import { Alert, Grid } from '@mantine/core';
import {
  IconAlertTriangle,
  IconLockCheck,
  IconPlugConnected,
  IconUserCircle,
} from '@tabler/icons-react';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useRuntimeConfig } from '../lib/use-runtime-config';
import { useSession } from '../lib/use-session';

export function DashboardPage() {
  const sessionQuery = useSession();
  const runtimeConfigQuery = useRuntimeConfig();
  const isTenantAdmin =
    sessionQuery.data?.roles?.includes('tenant_admin') ?? false;
  const isSuperAdmin =
    sessionQuery.data?.globalRoles?.includes('super_admin') ?? false;

  return (
    <>
      <PageHeader
        title="Overview"
        description="One SPA, role-aware navigation, and a deliberate split between user self-service and administrator controls."
        context={getActiveTenantLabel(sessionQuery.data)}
      />

      <Grid>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            icon={<IconUserCircle size={14} />}
            label="Session"
            tone="good"
            value={sessionQuery.data ? 'Authenticated' : 'Unavailable'}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            icon={<IconLockCheck size={14} />}
            label="Auth posture"
            value="Cookie-only"
            tone="good"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            icon={<IconPlugConnected size={14} />}
            label="Gateway"
            value={
              runtimeConfigQuery.data?.gatewayOnline ? 'Online' : 'Offline'
            }
            tone={runtimeConfigQuery.data?.gatewayOnline ? 'good' : 'warning'}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label="Role surface"
            value={
              isSuperAdmin
                ? 'Super admin + tenant + user'
                : isTenantAdmin
                  ? 'Tenant admin + user'
                  : 'User only'
            }
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label="Registration"
            value={
              runtimeConfigQuery.data?.registrationEnabled
                ? 'Enabled'
                : 'Disabled'
            }
          />
        </Grid.Col>
      </Grid>

      {!runtimeConfigQuery.data?.gatewayOnline ? (
        <Alert
          color="yellow"
          icon={<IconAlertTriangle size={18} />}
          mt="lg"
          title="Gateway circuit breaker is active"
        >
          User chat traffic should expect a service offline response until an
          administrator re-enables the gateway.
        </Alert>
      ) : null}
    </>
  );
}

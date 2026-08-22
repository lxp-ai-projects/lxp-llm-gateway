import { Alert, Grid } from '@mantine/core';
import {
  IconAlertTriangle,
  IconLockCheck,
  IconPlugConnected,
  IconUserCircle,
} from '@tabler/icons-react';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';
import { useTranslation } from 'react-i18next';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useRuntimeConfig } from '../lib/use-runtime-config';
import { useSession } from '../lib/use-session';

export function DashboardPage() {
  const { t } = useTranslation('pages');
  const sessionQuery = useSession();
  const runtimeConfigQuery = useRuntimeConfig();
  const isTenantAdmin =
    sessionQuery.data?.roles?.includes('tenant_admin') ?? false;
  const isSuperAdmin =
    sessionQuery.data?.globalRoles?.includes('super_admin') ?? false;

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        context={getActiveTenantLabel(sessionQuery.data)}
      />

      <Grid>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            icon={<IconUserCircle size={14} />}
            label={t('dashboard.session')}
            tone="good"
            value={sessionQuery.data ? t('dashboard.authenticated') : t('dashboard.unavailable')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            icon={<IconLockCheck size={14} />}
            label={t('dashboard.authPosture')}
            value={t('dashboard.cookieOnly')}
            tone="good"
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            icon={<IconPlugConnected size={14} />}
            label={t('dashboard.gateway')}
            value={
              runtimeConfigQuery.data?.gatewayOnline ? t('dashboard.online') : t('dashboard.offline')
            }
            tone={runtimeConfigQuery.data?.gatewayOnline ? 'good' : 'warning'}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label={t('dashboard.roleSurface')}
            value={
              isSuperAdmin
                ? t('dashboard.superAdminSurface')
                : isTenantAdmin
                  ? t('dashboard.tenantAdminSurface')
                  : t('dashboard.userSurface')
            }
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6, xl: 3 }}>
          <StatusTile
            label={t('dashboard.registration')}
            value={
              runtimeConfigQuery.data?.registrationEnabled
                ? t('dashboard.enabled')
                : t('dashboard.disabled')
            }
          />
        </Grid.Col>
      </Grid>

      {!runtimeConfigQuery.data?.gatewayOnline ? (
        <Alert
          color="yellow"
          icon={<IconAlertTriangle size={18} />}
          mt="lg"
          title={t('dashboard.breakerTitle')}
        >
          {t('dashboard.breakerDescription')}
        </Alert>
      ) : null}
    </>
  );
}

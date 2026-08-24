import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { adminApiClient } from '../../../lib/admin-api-client';
import { getLocalizedErrorMessage } from '../../../i18n/errors';

export function TenantRegistrationPanel({
  tenantId,
  activeTenantCount,
}: {
  tenantId: string;
  activeTenantCount: number;
}) {
  const { t } = useTranslation('tenants');
  const queryClient = useQueryClient();
  const [hostname, setHostname] = useState('');
  const settings = useQuery({
    queryKey: ['tenant-registration-settings', tenantId],
    queryFn: () => adminApiClient.getTenantRegistrationSettings(tenantId),
  });
  const hosts = useQuery({
    queryKey: ['tenant-public-hosts', tenantId],
    queryFn: () => adminApiClient.getTenantPublicHosts(tenantId),
  });
  const emailReadiness = useQuery({
    queryKey: ['tenant-registration-email-readiness', tenantId],
    queryFn: () => adminApiClient.getTenantRegistrationEmailReadiness(tenantId),
  });
  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['tenant-registration-settings', tenantId],
    });
    await queryClient.invalidateQueries({
      queryKey: ['tenant-public-hosts', tenantId],
    });
  };
  const updateSettings = useMutation({
    mutationFn: (enabled: boolean) =>
      adminApiClient.updateTenantRegistrationSettings(tenantId, enabled),
    onSuccess: invalidate,
  });
  const createHost = useMutation({
    mutationFn: () => adminApiClient.createTenantPublicHost(tenantId, hostname),
    onSuccess: async () => {
      setHostname('');
      await invalidate();
    },
  });
  const deleteHost = useMutation({
    mutationFn: (hostId: string) =>
      adminApiClient.deleteTenantPublicHost(tenantId, hostId),
    onSuccess: invalidate,
  });
  const updateHost = useMutation({
    mutationFn: ({
      hostId,
      payload,
    }: {
      hostId: string;
      payload: { enabled?: boolean; isPrimary?: boolean };
    }) => adminApiClient.updateTenantPublicHost(tenantId, hostId, payload),
    onSuccess: invalidate,
  });
  const pending =
    updateSettings.isPending ||
    createHost.isPending ||
    deleteHost.isPending ||
    updateHost.isPending;
  const mutationFailed =
    updateSettings.isError ||
    createHost.isError ||
    deleteHost.isError ||
    updateHost.isError;

  if (settings.isPending || hosts.isPending || emailReadiness.isPending)
    return (
      <Loader
        aria-label={t('tenantRegistrationPanel.loadingRegistrationSettings')}
      />
    );
  if (settings.isError || hosts.isError || emailReadiness.isError) {
    const error = settings.error ?? hosts.error ?? emailReadiness.error;
    const detail = getLocalizedErrorMessage(error);
    return (
      <Alert
        color="red"
        title={t(
          'tenantRegistrationPanel.registrationSettingsCouldNotBeLoaded',
        )}
      >
        {detail}{' '}
        {t('tenantRegistrationPanel.retryTheRequestOrContactTheDeployment')}
      </Alert>
    );
  }

  const emailReadinessLabel = t(
    `tenantRegistrationPanel.emailStatus.${emailReadiness.data.status}`,
  );

  return (
    <Stack gap="md">
      {mutationFailed ? (
        <Alert color="red">
          {t(
            'tenantRegistrationPanel.registrationSettingsCouldNotBeSavedPlease',
          )}
        </Alert>
      ) : null}
      {activeTenantCount > 1 && !hosts.data.some((host) => host.enabled) ? (
        <Alert color="yellow">
          {t('tenantRegistrationPanel.aPublicHostnameMappingIsRequiredWhen')}
        </Alert>
      ) : null}
      {!emailReadiness.data.globalRegistrationEnabled ? (
        <Alert
          color="yellow"
          title={t('tenantRegistrationPanel.globalRegistrationKillSwitchIsOff')}
        >
          {t(
            'tenantRegistrationPanel.thisTenantSettingCannotEnablePublicRegistration',
          )}
        </Alert>
      ) : null}
      <Alert
        color={emailReadiness.data.status === 'ready' ? 'teal' : 'yellow'}
        title={t('tenantRegistrationPanel.emailDeliveryStatus', {
          status: emailReadinessLabel,
        })}
      >
        {t('tenantRegistrationPanel.emailReadinessDetails', {
          provider: emailReadiness.data.provider,
          from:
            emailReadiness.data.fromEmail ??
            t('tenantRegistrationPanel.notConfigured'),
        })}
        {settings.data.enabled && emailReadiness.data.status !== 'ready'
          ? t('tenantRegistrationPanel.emailVerificationUnavailable')
          : ''}
      </Alert>
      <Switch
        label={t('tenantRegistrationPanel.allowPublicRegistration')}
        checked={settings.data.enabled}
        disabled={pending}
        onChange={(event) => updateSettings.mutate(event.currentTarget.checked)}
      />
      <Text size="sm" c="dimmed">
        {t('tenantRegistrationPanel.thisSwitchControlsOnlyTheSelectedTenant')}
      </Text>
      <Group align="end">
        <TextInput
          label={t('tenantRegistrationPanel.publicHostname')}
          placeholder={t('tenantRegistrationPanel.appExampleCom')}
          value={hostname}
          disabled={pending}
          onChange={(event) => setHostname(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button
          onClick={() => createHost.mutate()}
          loading={createHost.isPending}
          disabled={pending || !hostname.trim()}
        >
          {t('tenantRegistrationPanel.addHostname')}
        </Button>
      </Group>
      {hosts.data.map((host) => (
        <Group key={host.id} justify="space-between">
          <Text>{host.hostname}</Text>
          <Group gap="xs">
            <Switch
              label={t('tenantRegistrationPanel.enabled')}
              aria-label={t('tenantRegistrationPanel.enabledHostname', {
                hostname: host.hostname,
              })}
              checked={host.enabled}
              disabled={pending}
              onChange={(event) =>
                updateHost.mutate({
                  hostId: host.id,
                  payload: { enabled: event.currentTarget.checked },
                })
              }
            />
            <Switch
              label={t('tenantRegistrationPanel.primary')}
              aria-label={t('tenantRegistrationPanel.primaryHostname', {
                hostname: host.hostname,
              })}
              checked={host.isPrimary}
              disabled={pending}
              onChange={(event) =>
                updateHost.mutate({
                  hostId: host.id,
                  payload: { isPrimary: event.currentTarget.checked },
                })
              }
            />
            <Button
              size="xs"
              color="red"
              variant="subtle"
              onClick={() => {
                if (
                  window.confirm(
                    t('tenantRegistrationPanel.removeHostnameConfirm', {
                      hostname: host.hostname,
                    }),
                  )
                )
                  deleteHost.mutate(host.id);
              }}
              disabled={pending}
              aria-label={t('tenantRegistrationPanel.removeHostname', {
                hostname: host.hostname,
              })}
            >
              {t('tenantRegistrationPanel.remove')}
            </Button>
          </Group>
        </Group>
      ))}
    </Stack>
  );
}

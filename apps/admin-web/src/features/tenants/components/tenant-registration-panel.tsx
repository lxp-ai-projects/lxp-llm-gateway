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

export function TenantRegistrationPanel({
  tenantId,
  activeTenantCount,
}: {
  tenantId: string;
  activeTenantCount: number;
}) {
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
    return <Loader aria-label="Loading registration settings" />;
  if (settings.isError || hosts.isError || emailReadiness.isError) {
    const error = settings.error ?? hosts.error ?? emailReadiness.error;
    const detail = error instanceof Error ? error.message : 'Unknown API error.';
    return (
      <Alert color="red" title="Registration settings could not be loaded.">
        {detail} Restart `admin-api` from this branch, then apply the admin
        migrations with `pnpm db:migration:admin`. Confirm that the signed-in
        user has the `super_admin` role.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      {mutationFailed ? (
        <Alert color="red">
          Registration settings could not be saved. Please try again.
        </Alert>
      ) : null}
      {activeTenantCount > 1 && !hosts.data.some((host) => host.enabled) ? (
        <Alert color="yellow">
          A public hostname mapping is required when more than one active tenant
          exists.
        </Alert>
      ) : null}
      {!emailReadiness.data.globalRegistrationEnabled ? (
        <Alert color="yellow" title="Global registration kill switch is off">
          This tenant setting cannot enable public registration while
          `LXP_REGISTRATION_ENABLED` is false. Set it to `true` in the
          admin-api deployment environment and restart the service. Set it
          back to `false` to temporarily disable registration for every tenant.
        </Alert>
      ) : null}
      <Alert color={emailReadiness.data.status === 'ready' ? 'teal' : 'yellow'} title={`Email delivery: ${emailReadiness.data.status === 'ready' ? 'ready' : 'not ready'}`}>
        Provider: {emailReadiness.data.provider}. From: {emailReadiness.data.fromEmail ?? 'not configured'}.
        {settings.data.enabled && emailReadiness.data.status !== 'ready' ? ' Public registration is enabled but email verification is unavailable.' : ''}
      </Alert>
      <Switch
        label="Allow public registration"
        checked={settings.data.enabled}
        disabled={pending}
        onChange={(event) => updateSettings.mutate(event.currentTarget.checked)}
      />
      <Text size="sm" c="dimmed">
        This switch controls only the selected tenant. The deployment-level
        kill switch can temporarily close registration for every tenant. This
        release does not create accounts.
      </Text>
      <Group align="end">
        <TextInput
          label="Public hostname"
          placeholder="app.example.com"
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
          Add hostname
        </Button>
      </Group>
      {hosts.data.map((host) => (
        <Group key={host.id} justify="space-between">
          <Text>{host.hostname}</Text>
          <Group gap="xs">
            <Switch
              label="Enabled"
              aria-label={`Enabled ${host.hostname}`}
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
              label="Primary"
              aria-label={`Primary ${host.hostname}`}
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
                if (window.confirm(`Remove public hostname ${host.hostname}?`))
                  deleteHost.mutate(host.id);
              }}
              disabled={pending}
              aria-label={`Remove ${host.hostname}`}
            >
              Remove
            </Button>
          </Group>
        </Group>
      ))}
    </Stack>
  );
}

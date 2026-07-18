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

  if (settings.isPending || hosts.isPending)
    return <Loader aria-label="Loading registration settings" />;
  if (settings.isError || hosts.isError)
    return (
      <Alert color="red">Registration settings could not be loaded.</Alert>
    );

  return (
    <Stack gap="md">
      {activeTenantCount > 1 && !hosts.data.length ? (
        <Alert color="yellow">
          A public hostname mapping is required when more than one active tenant
          exists.
        </Alert>
      ) : null}
      <Switch
        label="Allow public registration"
        checked={settings.data.enabled}
        disabled={pending}
        onChange={(event) => updateSettings.mutate(event.currentTarget.checked)}
      />
      <Text size="sm" c="dimmed">
        The global registration kill switch must also be enabled. This release
        does not create accounts.
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
            >
              Remove
            </Button>
          </Group>
        </Group>
      ))}
    </Stack>
  );
}

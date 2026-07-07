import {
  Alert,
  Anchor,
  Button,
  Card,
  Grid,
  Group,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArrowRight,
  IconCheck,
  IconDeviceFloppy,
  IconInfoCircle,
  IconPlugConnected,
  IconUserCog,
} from '@tabler/icons-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { PageHeader } from '../components/page-header';
import { StatusTile } from '../components/status-tile';
import { adminApiClient } from '../lib/api-client';
import type { ParsedApiError } from '../lib/api-base';
import { getActiveTenantLabel } from '../lib/tenant-context';
import { useSession } from '../lib/use-session';

export function ProfilePage() {
  const queryClient = useQueryClient();
  const sessionQuery = useSession();
  const [displayName, setDisplayName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(sessionQuery.data?.displayName ?? '');
  }, [sessionQuery.data?.displayName]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { displayName: string }) =>
      adminApiClient.updateProfile(payload),
    onMutate: () => {
      setSuccessMessage(null);
      setErrorMessage(null);
    },
    onSuccess: async (nextSession) => {
      queryClient.setQueryData(['session'], nextSession);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      setDisplayName(nextSession.displayName);
      setSuccessMessage('Your profile has been updated.');
    },
    onError: (error: Error) => {
      const apiError = error as Error & Partial<ParsedApiError>;
      setErrorMessage(apiError.message || 'Unable to update your profile.');
    },
  });

  const trimmedDisplayName = displayName.trim();
  const currentDisplayName = sessionQuery.data?.displayName ?? '';
  const isSaveDisabled =
    sessionQuery.isLoading ||
    updateProfileMutation.isPending ||
    trimmedDisplayName.length === 0 ||
    trimmedDisplayName === currentDisplayName;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Update the account details tied to your current browser session."
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
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card className="section-card">
            <Stack gap="md">
              <div>
                <Text fw={700}>Profile details</Text>
                <Text c="dimmed" size="sm">
                  Change the display name shown across the admin workspace.
                </Text>
              </div>

              {successMessage ? (
                <Alert
                  color="teal"
                  icon={<IconCheck size={18} />}
                  title="Profile updated"
                >
                  {successMessage}
                </Alert>
              ) : null}

              {errorMessage ? (
                <Alert
                  color="red"
                  icon={<IconUserCog size={18} />}
                  title="Update failed"
                >
                  {errorMessage}
                </Alert>
              ) : null}

              <TextInput
                data-testid="profile-display-name-input"
                label="Display name"
                onChange={(event) => {
                  setDisplayName(event.currentTarget.value);
                  if (successMessage) {
                    setSuccessMessage(null);
                  }
                }}
                placeholder="Your display name"
                value={displayName}
              />

              <TextInput
                data-testid="profile-email-input"
                label="Email"
                value={sessionQuery.data?.email ?? ''}
                disabled
              />

              <Group justify="space-between" align="end">
                <Text c="dimmed" size="sm">
                  Email changes stay server-managed for now.
                </Text>
                <Button
                  data-testid="profile-save-button"
                  leftSection={<IconDeviceFloppy size={16} />}
                  loading={updateProfileMutation.isPending}
                  disabled={isSaveDisabled}
                  onClick={() =>
                    updateProfileMutation.mutate({
                      displayName: trimmedDisplayName,
                    })
                  }
                >
                  Save profile
                </Button>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 12 }}>
          <Card className="section-card">
            <Group justify="space-between" align="start" wrap="nowrap">
              <Group align="start" gap="md" wrap="nowrap">
                <ThemeIcon color="teal" radius="xl" size="lg" variant="light">
                  <IconPlugConnected size={18} />
                </ThemeIcon>
                <Stack gap={4}>
                  <Text fw={700}>Providers</Text>
                  <Text c="dimmed" size="sm">
                    Provider tokens and endpoint configuration live on the dedicated
                    provider setup page.
                  </Text>
                </Stack>
              </Group>
              <Anchor
                component={Link}
                to="/app/providers"
                underline="hover"
              >
                <Group gap={6} wrap="nowrap">
                  <Text size="sm">Open provider settings</Text>
                  <IconArrowRight size={16} />
                </Group>
              </Anchor>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>
      <Alert
        color="blue"
        icon={<IconInfoCircle size={18} />}
        mt="lg"
        title="Next profile surfaces"
      >
        Password change and per-user analytics cards can be added here once the
        remaining self-service endpoints are ready.
      </Alert>
    </>
  );
}

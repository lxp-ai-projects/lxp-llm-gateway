import {
  Alert,
  Anchor,
  Button,
  Card,
  Grid,
  Group,
  PasswordInput,
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
  IconLockPassword,
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

function getErrorMessage(error: Error): string {
  const apiError = error as Error & Partial<ParsedApiError>;
  return apiError.message || 'Unable to complete the request.';
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const sessionQuery = useSession();
  const [displayName, setDisplayName] = useState('');
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(
    null,
  );
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(
    null,
  );
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(
    null,
  );
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(
    null,
  );
  const [passwordValidationMessage, setPasswordValidationMessage] = useState<
    string | null
  >(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  useEffect(() => {
    setDisplayName(sessionQuery.data?.displayName ?? '');
  }, [sessionQuery.data?.displayName]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { displayName: string }) =>
      adminApiClient.updateProfile(payload),
    onMutate: () => {
      setProfileSuccessMessage(null);
      setProfileErrorMessage(null);
    },
    onSuccess: async (nextSession) => {
      queryClient.setQueryData(['session'], nextSession);
      await queryClient.invalidateQueries({ queryKey: ['session'] });
      setDisplayName(nextSession.displayName);
      setProfileSuccessMessage('Your profile has been updated.');
    },
    onError: (error: Error) => {
      setProfileErrorMessage(getErrorMessage(error));
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: {
      currentPassword: string;
      newPassword: string;
      confirmNewPassword: string;
    }) => adminApiClient.changeOwnPassword(payload),
    onMutate: () => {
      setPasswordSuccessMessage(null);
      setPasswordErrorMessage(null);
      setPasswordValidationMessage(null);
    },
    onSuccess: (result) => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccessMessage(result.message);
    },
    onError: (error: Error) => {
      setPasswordErrorMessage(getErrorMessage(error));
    },
  });

  const trimmedDisplayName = displayName.trim();
  const currentDisplayName = sessionQuery.data?.displayName ?? '';
  const isProfileSaveDisabled =
    sessionQuery.isLoading ||
    updateProfileMutation.isPending ||
    trimmedDisplayName.length === 0 ||
    trimmedDisplayName === currentDisplayName;
  const isPasswordSaveDisabled =
    changePasswordMutation.isPending ||
    currentPassword.length === 0 ||
    newPassword.length === 0 ||
    confirmNewPassword.length === 0;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage the account details and password tied to your current browser session."
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
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card className="section-card">
            <Stack gap="md">
              <div>
                <Text fw={700}>Profile details</Text>
                <Text c="dimmed" size="sm">
                  Change the display name shown across the admin workspace.
                </Text>
              </div>

              {profileSuccessMessage ? (
                <Alert
                  color="teal"
                  icon={<IconCheck size={18} />}
                  title="Profile updated"
                >
                  {profileSuccessMessage}
                </Alert>
              ) : null}

              {profileErrorMessage ? (
                <Alert
                  color="red"
                  icon={<IconUserCog size={18} />}
                  title="Update failed"
                >
                  {profileErrorMessage}
                </Alert>
              ) : null}

              <TextInput
                data-testid="profile-display-name-input"
                label="Display name"
                onChange={(event) => {
                  setDisplayName(event.currentTarget.value);
                  if (profileSuccessMessage) {
                    setProfileSuccessMessage(null);
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
                  disabled={isProfileSaveDisabled}
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
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card className="section-card">
            <Stack gap="md">
              <div>
                <Text fw={700}>Security</Text>
                <Text c="dimmed" size="sm">
                  Change your password without leaving the current session.
                </Text>
              </div>

              {passwordSuccessMessage ? (
                <Alert
                  color="teal"
                  icon={<IconCheck size={18} />}
                  title="Password updated"
                >
                  {passwordSuccessMessage}
                </Alert>
              ) : null}

              {passwordValidationMessage ? (
                <Alert
                  color="yellow"
                  icon={<IconInfoCircle size={18} />}
                  title="Check your entries"
                >
                  {passwordValidationMessage}
                </Alert>
              ) : null}

              {passwordErrorMessage ? (
                <Alert
                  color="red"
                  icon={<IconLockPassword size={18} />}
                  title="Password change failed"
                >
                  {passwordErrorMessage}
                </Alert>
              ) : null}

              <PasswordInput
                data-testid="profile-current-password-input"
                label="Current password"
                autoComplete="current-password"
                onChange={(event) => {
                  setCurrentPassword(event.currentTarget.value);
                  if (passwordSuccessMessage) {
                    setPasswordSuccessMessage(null);
                  }
                }}
                value={currentPassword}
              />

              <PasswordInput
                data-testid="profile-new-password-input"
                label="New password"
                autoComplete="new-password"
                onChange={(event) => {
                  setNewPassword(event.currentTarget.value);
                  if (passwordSuccessMessage) {
                    setPasswordSuccessMessage(null);
                  }
                }}
                value={newPassword}
              />

              <PasswordInput
                data-testid="profile-confirm-new-password-input"
                label="Confirm new password"
                autoComplete="new-password"
                onChange={(event) => {
                  setConfirmNewPassword(event.currentTarget.value);
                  if (passwordSuccessMessage) {
                    setPasswordSuccessMessage(null);
                  }
                }}
                value={confirmNewPassword}
              />

              <Group justify="space-between" align="end">
                <Text c="dimmed" size="sm">
                  We verify your current password before saving a new one.
                </Text>
                <Button
                  data-testid="profile-change-password-button"
                  leftSection={<IconLockPassword size={16} />}
                  loading={changePasswordMutation.isPending}
                  disabled={isPasswordSaveDisabled}
                  onClick={() => {
                    if (newPassword !== confirmNewPassword) {
                      setPasswordValidationMessage(
                        'New password confirmation does not match.',
                      );
                      setPasswordSuccessMessage(null);
                      setPasswordErrorMessage(null);
                      return;
                    }

                    changePasswordMutation.mutate({
                      currentPassword,
                      newPassword,
                      confirmNewPassword,
                    });
                  }}
                >
                  Change password
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
              <Anchor component={Link} to="/app/providers" underline="hover">
                <Group gap={6} wrap="nowrap">
                  <Text size="sm">Open provider settings</Text>
                  <IconArrowRight size={16} />
                </Group>
              </Anchor>
            </Group>
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}

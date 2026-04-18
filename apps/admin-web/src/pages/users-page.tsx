import { Alert, Button } from '@mantine/core';
import { IconUsersGroup } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

import { CreateUserModal } from '../features/users/components/create-user-modal';
import { ProviderCredentialsModal } from '../features/users/components/provider-credentials-modal';
import { UsersDirectoryPanel } from '../features/users/components/users-directory-panel';
import { PageHeader } from '../components/page-header';
import { adminApiClient, type AdminUserSummary } from '../lib/api-client';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [credentialsOpened, credentialsControls] = useDisclosure(false);
  const [createUserOpened, createUserControls] = useDisclosure(false);
  const [createDisplayName, setCreateDisplayName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRoles, setCreateRoles] = useState<string[]>(['user']);
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApiClient.getUsers(),
  });
  const credentialsQuery = useQuery({
    queryKey: ['admin-user-provider-credentials', selectedUser?.userUuid],
    queryFn: () => adminApiClient.getUserProviderCredentials(selectedUser!.userUuid),
    enabled: Boolean(selectedUser?.userUuid),
  });
  const updateUserMutation = useMutation({
    mutationFn: (payload: { userUuid: string; status: 'active' | 'disabled' }) =>
      adminApiClient.updateUser(payload.userUuid, { status: payload.status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
  const createUserMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createUser({
        email: createEmail.trim(),
        password: createPassword,
        displayName: createDisplayName.trim(),
        roles: createRoles.length ? createRoles : ['user'],
      }),
    onSuccess: async () => {
      resetCreateUserForm();
      createUserControls.close();
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const filteredUsers = useMemo(
    () =>
      (usersQuery.data ?? []).filter((user) => {
        const haystack = `${user.displayName} ${user.email} ${user.roles.join(' ')}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [search, usersQuery.data],
  );

  function resetCreateUserForm() {
    setCreateDisplayName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRoles(['user']);
  }

  function handleCreateUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createDisplayName.trim() || !createEmail.trim() || createPassword.length < 8) {
      return;
    }

    createUserMutation.mutate();
  }

  return (
    <>
      <PageHeader
        title="User Management"
        description="Administrative user controls for search, lifecycle management, role assignment, and password reset workflows."
        aside={
          <Button
            onClick={createUserControls.open}
          >
            Create user
          </Button>
        }
      />
      <UsersDirectoryPanel
        filteredUsers={filteredUsers}
        onOpenCredentials={(user) => {
          setSelectedUser(user);
          credentialsControls.open();
        }}
        onSearchChange={setSearch}
        onStatusChange={(userUuid, status) =>
          updateUserMutation.mutate({
            userUuid,
            status,
          })
        }
        search={search}
      />
      <Alert color="blue" icon={<IconUsersGroup size={18} />} mt="lg" title="Backend dependency">
        User listing and basic lifecycle editing are now connected. Role reassignment, pagination, primary-admin
        transfer, and password reset flow still need deeper backend support.
      </Alert>
      <CreateUserModal
        createDisplayName={createDisplayName}
        createEmail={createEmail}
        createPassword={createPassword}
        createRoles={createRoles}
        isPending={createUserMutation.isPending}
        onClose={() => {
          createUserControls.close();
          resetCreateUserForm();
        }}
        onDisplayNameChange={setCreateDisplayName}
        onEmailChange={setCreateEmail}
        onPasswordChange={setCreatePassword}
        onRolesChange={setCreateRoles}
        opened={createUserOpened}
        onSubmit={handleCreateUserSubmit}
      />
      <ProviderCredentialsModal
        credentials={credentialsQuery.data ?? []}
        opened={credentialsOpened}
        onClose={credentialsControls.close}
        userDisplayName={selectedUser?.displayName ?? null}
      />
    </>
  );
}

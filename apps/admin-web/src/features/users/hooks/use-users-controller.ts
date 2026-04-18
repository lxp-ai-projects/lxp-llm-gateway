import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';

import { adminApiClient, type AdminUserSummary } from '../../../lib/api-client';

export function useUsersController() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(
    null,
  );
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
    queryFn: () =>
      adminApiClient.getUserProviderCredentials(selectedUser!.userUuid),
    enabled: Boolean(selectedUser?.userUuid),
  });
  const updateUserMutation = useMutation({
    mutationFn: (payload: {
      userUuid: string;
      status: 'active' | 'disabled';
    }) =>
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
        const haystack =
          `${user.displayName} ${user.email} ${user.roles.join(' ')}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [search, usersQuery.data],
  );
  const credentials = credentialsQuery.data ?? [];

  function resetCreateUserForm() {
    setCreateDisplayName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRoles(['user']);
  }

  function handleCreateUserSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !createDisplayName.trim() ||
      !createEmail.trim() ||
      createPassword.length < 8
    ) {
      return;
    }

    createUserMutation.mutate();
  }

  return {
    createDisplayName,
    createEmail,
    createPassword,
    createRoles,
    credentials,
    credentialsOpened,
    createUserOpened,
    filteredUsers,
    handleCreateUserSubmit,
    isCreateUserPending: createUserMutation.isPending,
    onCreateDisplayNameChange: setCreateDisplayName,
    onCreateEmailChange: setCreateEmail,
    onCreatePasswordChange: setCreatePassword,
    onCreateRolesChange: setCreateRoles,
    onOpenCreateUser: createUserControls.open,
    onCloseCreateUser: () => {
      createUserControls.close();
      resetCreateUserForm();
    },
    onOpenCredentials: (user: AdminUserSummary) => {
      setSelectedUser(user);
      credentialsControls.open();
    },
    onCloseCredentials: credentialsControls.close,
    onSearchChange: setSearch,
    onStatusChange: (userUuid: string, status: 'active' | 'disabled') =>
      updateUserMutation.mutate({
        userUuid,
        status,
      }),
    resetCreateUserForm,
    search,
    selectedUser,
  };
}

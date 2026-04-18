import { Alert, Button } from '@mantine/core';
import { IconUsersGroup } from '@tabler/icons-react';

import { CreateUserModal } from '../features/users/components/create-user-modal';
import { ProviderCredentialsModal } from '../features/users/components/provider-credentials-modal';
import { UsersDirectoryPanel } from '../features/users/components/users-directory-panel';
import { useUsersController } from '../features/users/hooks/use-users-controller';
import { PageHeader } from '../components/page-header';

export function UsersPage() {
  const {
    createDisplayName,
    createEmail,
    createPassword,
    createRoles,
    credentials,
    credentialsOpened,
    createUserOpened,
    filteredUsers,
    handleCreateUserSubmit,
    isCreateUserPending,
    onCloseCreateUser,
    onCloseCredentials,
    onCreateDisplayNameChange,
    onCreateEmailChange,
    onCreatePasswordChange,
    onCreateRolesChange,
    onOpenCreateUser,
    onOpenCredentials,
    onSearchChange,
    onStatusChange,
    search,
    selectedUser,
  } = useUsersController();

  return (
    <>
      <PageHeader
        title="User Management"
        description="Administrative user controls for search, lifecycle management, role assignment, and password reset workflows."
        aside={
          <Button data-testid="users-create-open" onClick={onOpenCreateUser}>
            Create user
          </Button>
        }
      />
      <UsersDirectoryPanel
        filteredUsers={filteredUsers}
        onOpenCredentials={onOpenCredentials}
        onSearchChange={onSearchChange}
        onStatusChange={onStatusChange}
        search={search}
      />
      <Alert
        color="blue"
        icon={<IconUsersGroup size={18} />}
        mt="lg"
        title="Backend dependency"
      >
        User listing and basic lifecycle editing are now connected. Role
        reassignment, pagination, primary-admin transfer, and password reset
        flow still need deeper backend support.
      </Alert>
      <CreateUserModal
        createDisplayName={createDisplayName}
        createEmail={createEmail}
        createPassword={createPassword}
        createRoles={createRoles}
        isPending={isCreateUserPending}
        onClose={onCloseCreateUser}
        onDisplayNameChange={onCreateDisplayNameChange}
        onEmailChange={onCreateEmailChange}
        onPasswordChange={onCreatePasswordChange}
        onRolesChange={onCreateRolesChange}
        opened={createUserOpened}
        onSubmit={handleCreateUserSubmit}
      />
      <ProviderCredentialsModal
        credentials={credentials}
        opened={credentialsOpened}
        onClose={onCloseCredentials}
        userDisplayName={selectedUser?.displayName ?? null}
      />
    </>
  );
}

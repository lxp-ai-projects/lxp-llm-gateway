import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  MultiSelect,
  PasswordInput,
  SimpleGrid,
  Modal,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch, IconShieldCheck, IconUserCircle, IconUsersGroup } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';

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

  function renderUserActions(user: AdminUserSummary) {
    return (
      <Group gap="xs" wrap="wrap" className="users-actions">
        <Select
          className="users-status-select"
          data={[
            { value: 'active', label: 'Active' },
            { value: 'disabled', label: 'Disabled' },
          ]}
          value={user.status}
          onChange={(value) => {
            if (value && value !== user.status) {
              updateUserMutation.mutate({
                userUuid: user.userUuid,
                status: value as 'active' | 'disabled',
              });
            }
          }}
          size="xs"
        />
        <Button
          size="xs"
          variant="light"
          onClick={() => {
            setSelectedUser(user);
            credentialsControls.open();
          }}
        >
          View credentials
        </Button>
        <Button size="xs" variant="subtle">
          Reset password
        </Button>
      </Group>
    );
  }

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

  function renderMobileUserSummary(user: AdminUserSummary) {
    const isAdmin = user.roles.includes('admin');
    const RoleIcon = isAdmin ? IconShieldCheck : IconUserCircle;

    return (
      <Group gap="sm" wrap="nowrap" className="users-mobile-summary">
        <div className={`users-mobile-role-icon ${isAdmin ? 'admin' : 'user'}`}>
          <RoleIcon size={18} />
        </div>
        <div className="users-mobile-summary-copy">
          <Text fw={700}>{user.displayName}</Text>
          <Text size="sm" c="dimmed">
            {user.email}
          </Text>
        </div>
      </Group>
    );
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
      <Card className="section-card">
        <Group justify="space-between" mb="md" className="users-toolbar">
          <Title order={3}>Directory</Title>
          <TextInput
            className="users-search"
            leftSection={<IconSearch size={16} />}
            placeholder="Search users..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Group>
        <div className="users-cards" aria-label="Mobile user cards">
          <Accordion variant="separated" radius="lg" className="users-mobile-accordion">
            {filteredUsers.map((user) => (
              <Accordion.Item key={user.userUuid} value={user.userUuid} className="users-mobile-card">
                <Accordion.Control>{renderMobileUserSummary(user)}</Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    <SimpleGrid cols={2} spacing="sm" verticalSpacing="sm">
                      <div>
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                          Roles
                        </Text>
                        <Group gap="xs" wrap="wrap" mt={6}>
                          {user.roles.map((role) => (
                            <Badge key={role} variant="light">
                              {role}
                            </Badge>
                          ))}
                        </Group>
                      </div>
                      <div>
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                          Status
                        </Text>
                        <Badge color={user.status === 'active' ? 'moss' : 'red'} variant="light" mt={6}>
                          {user.status}
                        </Badge>
                      </div>
                    </SimpleGrid>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={6}>
                        Actions
                      </Text>
                      {renderUserActions(user)}
                    </div>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
        <Table.ScrollContainer minWidth={760} className="users-table-scroll">
          <Table highlightOnHover className="users-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredUsers.map((user) => (
                <Table.Tr key={user.userUuid}>
                  <Table.Td>
                    <Text fw={600}>{user.displayName}</Text>
                    <Text size="sm" c="dimmed">
                      {user.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="wrap">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="light">
                          {role}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.status === 'active' ? 'moss' : 'red'} variant="light">
                      {user.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{renderUserActions(user)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
      <Alert color="blue" icon={<IconUsersGroup size={18} />} mt="lg" title="Backend dependency">
        User listing and basic lifecycle editing are now connected. Role reassignment, pagination, primary-admin
        transfer, and password reset flow still need deeper backend support.
      </Alert>
      <Modal
        opened={createUserOpened}
        onClose={() => {
          createUserControls.close();
          resetCreateUserForm();
        }}
        title="Create user"
      >
        <form onSubmit={handleCreateUserSubmit}>
          <Stack gap="sm">
            <Text c="dimmed" size="sm">
              Create a new platform account with the minimum credentials required to sign in.
            </Text>
            <TextInput
              label="Display name"
              placeholder="Emilie Joli"
              value={createDisplayName}
              onChange={(event) => setCreateDisplayName(event.currentTarget.value)}
            />
            <TextInput
              label="Email"
              placeholder="emilie@example.com"
              type="email"
              value={createEmail}
              onChange={(event) => setCreateEmail(event.currentTarget.value)}
            />
            <PasswordInput
              label="Temporary password"
              description="Minimum 8 characters."
              value={createPassword}
              onChange={(event) => setCreatePassword(event.currentTarget.value)}
            />
            <MultiSelect
              label="Roles"
              data={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' },
              ]}
              value={createRoles}
              onChange={setCreateRoles}
              searchable={false}
            />
            <Group justify="space-between">
              <Button
                type="button"
                variant="light"
                onClick={() => {
                  createUserControls.close();
                  resetCreateUserForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createUserMutation.isPending}
                disabled={!createDisplayName.trim() || !createEmail.trim() || createPassword.length < 8}
              >
                Create user
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
      <Modal
        opened={credentialsOpened}
        onClose={credentialsControls.close}
        title={`Provider credentials${selectedUser ? `: ${selectedUser.displayName}` : ''}`}
      >
        <div className="provider-credentials-cards" aria-label="Mobile provider credentials">
          <Stack gap="sm">
            {(credentialsQuery.data ?? []).map((credential) => (
              <Card key={credential.id} className="provider-credential-card" padding="md" radius="lg" withBorder>
                <Stack gap="sm">
                  <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                      Provider
                    </Text>
                    <Text fw={600} mt={4}>
                      {credential.providerDisplayName}
                    </Text>
                  </div>
                  <SimpleGrid cols={2} spacing="sm" verticalSpacing="sm">
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Label
                      </Text>
                      <Text mt={4}>{credential.label}</Text>
                    </div>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Masked value
                      </Text>
                      <Text mt={4}>{credential.maskedHint ?? 'Hidden'}</Text>
                    </div>
                  </SimpleGrid>
                </Stack>
              </Card>
            ))}
          </Stack>
        </div>
        <Table.ScrollContainer minWidth={440}>
          <Table highlightOnHover className="provider-credentials-table">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Provider</Table.Th>
                <Table.Th>Label</Table.Th>
                <Table.Th>Masked value</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(credentialsQuery.data ?? []).map((credential) => (
                <Table.Tr key={credential.id}>
                  <Table.Td>{credential.providerDisplayName}</Table.Td>
                  <Table.Td>{credential.label}</Table.Td>
                  <Table.Td>{credential.maskedHint ?? 'Hidden'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Modal>
    </>
  );
}

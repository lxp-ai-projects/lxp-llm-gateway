import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch, IconUsersGroup } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { PageHeader } from '../components/page-header';
import { adminApiClient, type AdminUserSummary } from '../lib/api-client';

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [credentialsOpened, credentialsControls] = useDisclosure(false);
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

  const filteredUsers = useMemo(
    () =>
      (usersQuery.data ?? []).filter((user) => {
        const haystack = `${user.displayName} ${user.email} ${user.roles.join(' ')}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      }),
    [search, usersQuery.data],
  );

  return (
    <>
      <PageHeader
        title="User Management"
        description="Administrative user controls for search, lifecycle management, role assignment, and password reset workflows."
        aside={<Button>Create user</Button>}
      />
      <Card className="section-card">
        <Group justify="space-between" mb="md">
          <Title order={3}>Directory</Title>
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder="Search users..."
            w={280}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
        </Group>
        <Table highlightOnHover>
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
                  <Group gap="xs">
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
                <Table.Td>
                  <Group gap="xs">
                    <Select
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
                      w={120}
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
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
      <Alert color="blue" icon={<IconUsersGroup size={18} />} mt="lg" title="Backend dependency">
        User listing and basic lifecycle editing are now connected. Role reassignment, pagination, primary-admin
        transfer, and password reset flow still need deeper backend support.
      </Alert>
      <Modal
        opened={credentialsOpened}
        onClose={credentialsControls.close}
        title={`Provider credentials${selectedUser ? `: ${selectedUser.displayName}` : ''}`}
      >
        <Table highlightOnHover>
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
      </Modal>
    </>
  );
}

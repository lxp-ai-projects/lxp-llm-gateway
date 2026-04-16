import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch, IconUsersGroup } from '@tabler/icons-react';

import { PageHeader } from '../components/page-header';

const placeholderUsers = [
  { displayName: 'Primary Admin', email: 'bootstrap@example.com', role: 'admin', status: 'active' },
  { displayName: 'Patrick', email: 'patrick@example.com', role: 'user', status: 'active' },
  { displayName: 'Laurie', email: 'laurie@example.com', role: 'admin', status: 'disabled' },
];

export function UsersPage() {
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
          <TextInput leftSection={<IconSearch size={16} />} placeholder="Search users..." w={280} />
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
            {placeholderUsers.map((user) => (
              <Table.Tr key={user.email}>
                <Table.Td>
                  <Text fw={600}>{user.displayName}</Text>
                  <Text size="sm" c="dimmed">
                    {user.email}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light">{user.role}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={user.status === 'active' ? 'moss' : 'red'} variant="light">
                    {user.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button size="xs" variant="light">
                      Edit
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
        This admin surface is intentionally scaffolded ahead of the final backend endpoints for pagination,
        filtering, lifecycle actions, and primary-admin transfer rules.
      </Alert>
    </>
  );
}

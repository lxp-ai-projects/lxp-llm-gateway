import {
  Accordion,
  Badge,
  Button,
  Card,
  Group,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconSearch, IconShieldCheck, IconUserCircle } from '@tabler/icons-react';

import type { AdminUserSummary } from '../../../lib/api-client';

type UsersDirectoryPanelProps = {
  filteredUsers: AdminUserSummary[];
  onOpenCredentials: (user: AdminUserSummary) => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (userUuid: string, status: 'active' | 'disabled') => void;
  search: string;
};

export function UsersDirectoryPanel({
  filteredUsers,
  onOpenCredentials,
  onSearchChange,
  onStatusChange,
  search,
}: UsersDirectoryPanelProps) {
  function renderUserActions(user: AdminUserSummary) {
    return (
      <Group gap="xs" wrap="wrap" className="users-actions">
        <Select
          className="users-status-select"
          data={[
            { value: 'active', label: 'Active' },
            { value: 'disabled', label: 'Disabled' },
          ]}
          onChange={(value) => {
            if (value && value !== user.status) {
              onStatusChange(user.userUuid, value as 'active' | 'disabled');
            }
          }}
          size="xs"
          value={user.status}
        />
        <Button
          data-testid={`users-view-credentials-${user.userUuid}`}
          onClick={() => onOpenCredentials(user)}
          size="xs"
          variant="light"
        >
          View credentials
        </Button>
        <Button size="xs" variant="subtle">
          Reset password
        </Button>
      </Group>
    );
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
    <Card className="section-card">
      <Group justify="space-between" mb="md" className="users-toolbar">
        <Title order={3}>Directory</Title>
        <TextInput
          className="users-search"
          data-testid="users-search-input"
          leftSection={<IconSearch size={16} />}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          placeholder="Search users..."
          value={search}
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
  );
}

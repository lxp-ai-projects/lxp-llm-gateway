import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
  PasswordInput,
} from '@mantine/core';

import { PageHeader } from '../components/page-header';
import { useTenantsController } from '../features/tenants/hooks/use-tenants-controller';

export function TenantsPage() {
  const {
    createAllowOverride,
    createDisplayName,
    createMemberDisplayName,
    createMemberEmail,
    createMemberOpened,
    createMemberPassword,
    createMemberRoles,
    createOpened,
    createSlug,
    editGlobalRoles,
    editGlobalRolesOpened,
    editAllowOverride,
    editDisplayName,
    editMemberOpened,
    editMemberRoles,
    editMemberStatus,
    editStatus,
    handleCreateTenantSubmit,
    handleCreateTenantUserSubmit,
    handleUpdateGlobalRolesSubmit,
    handleUpdateTenantSubmit,
    handleUpdateTenantUserSubmit,
    isCreatePending,
    isCreateTenantUserPending,
    isUpdateGlobalRolesPending,
    isUpdatePending,
    isUpdateTenantUserPending,
    memberships,
    membershipsQuery,
    onCloseCreate,
    onCloseCreateMember,
    onCloseEditGlobalRoles,
    onCloseEditMember,
    onCreateAllowOverrideChange,
    onCreateDisplayNameChange,
    onCreateMemberDisplayNameChange,
    onCreateMemberEmailChange,
    onCreateMemberPasswordChange,
    onCreateMemberRolesChange,
    onCreateSlugChange,
    onEditAllowOverrideChange,
    onEditDisplayNameChange,
    onEditGlobalRolesChange,
    onEditMemberRolesChange,
    onEditMemberStatusChange,
    onEditStatusChange,
    onOpenCreate,
    onOpenCreateMember,
    onOpenEditGlobalRoles,
    onOpenEditMember,
    onSelectTenant,
    activeTenantLabel,
    selectedMembershipIsSelf,
    selectedMembershipIsProtected,
    selectedMembership,
    selectedTenant,
    tenantCards,
    tenantsQuery,
    updateGlobalRolesError,
  } = useTenantsController();

  return (
    <>
      <PageHeader
        title="Tenant Control"
        description="Global super-admin surface for isolated workspace provisioning, tenant policy tuning, and cross-tenant visibility."
        context={activeTenantLabel}
        aside={<Button onClick={onOpenCreate}>Create tenant</Button>}
      />

      <Grid gutter="lg">
        <Grid.Col span={{ base: 12, xl: 5 }}>
          <Card className="section-card">
            <Group justify="space-between" mb="md">
              <Title order={3}>Tenants</Title>
              <Badge variant="light">
                {tenantCards.length} total
              </Badge>
            </Group>
            <Stack gap="sm">
              {tenantCards.map((tenant) => (
                <Card
                  key={tenant.id}
                  withBorder
                  radius="lg"
                  className="tenant-card"
                  style={{
                    cursor: 'pointer',
                    borderColor:
                      selectedTenant?.id === tenant.id
                        ? 'var(--mantine-color-teal-5)'
                        : undefined,
                  }}
                  onClick={() => onSelectTenant(tenant)}
                >
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={700}>{tenant.displayName}</Text>
                      <Text size="sm" c="dimmed">
                        {tenant.slug}
                      </Text>
                    </div>
                    <Badge
                      color={tenant.status === 'active' ? 'moss' : 'red'}
                      variant="light"
                    >
                      {tenant.status}
                    </Badge>
                  </Group>
                  <SimpleGrid cols={2} mt="md" spacing="sm">
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        Memberships
                      </Text>
                      <Text fw={600}>{tenant.membershipCount}</Text>
                    </div>
                    <div>
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                        User override
                      </Text>
                      <Text fw={600}>
                        {tenant.allowUserCredentialOverride ? 'Allowed' : 'Disabled'}
                      </Text>
                    </div>
                  </SimpleGrid>
                </Card>
              ))}
              {!tenantCards.length && !tenantsQuery.isPending ? (
                <Text c="dimmed" size="sm">
                  No tenants found yet.
                </Text>
              ) : null}
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, xl: 7 }}>
          <Stack gap="lg">
            <Card className="section-card">
              <Group justify="space-between" mb="md">
                <Title order={3}>Tenant Settings</Title>
                {selectedTenant ? (
                  <Badge variant="outline">{selectedTenant.slug}</Badge>
                ) : null}
              </Group>
              {selectedTenant ? (
                <form onSubmit={handleUpdateTenantSubmit}>
                  <Stack gap="md">
                    <TextInput
                      label="Display name"
                      value={editDisplayName}
                      onChange={(event) =>
                        onEditDisplayNameChange(event.currentTarget.value)
                      }
                    />
                    <Select
                      label="Status"
                      data={[
                        { value: 'active', label: 'Active' },
                        { value: 'disabled', label: 'Disabled' },
                      ]}
                      value={editStatus}
                      onChange={onEditStatusChange}
                    />
                    <Switch
                      checked={editAllowOverride}
                      label="Allow user credential override"
                      description="When enabled, user-scoped BYOK credentials can override the tenant default."
                      onChange={(event) =>
                        onEditAllowOverrideChange(event.currentTarget.checked)
                      }
                    />
                    <Group justify="flex-end">
                      <Button loading={isUpdatePending} type="submit">
                        Save tenant
                      </Button>
                    </Group>
                  </Stack>
                </form>
              ) : (
                <Text c="dimmed" size="sm">
                  Select a tenant to inspect or update its control-plane settings.
                </Text>
              )}
            </Card>

            <Card className="section-card">
              <Group justify="space-between" mb="md">
                <Title order={3}>Memberships</Title>
                <Group gap="sm">
                  {selectedTenant ? (
                    <Badge variant="light">{memberships.length} members</Badge>
                  ) : null}
                  <Button
                    size="xs"
                    onClick={onOpenCreateMember}
                    disabled={!selectedTenant}
                  >
                    Add member
                  </Button>
                </Group>
              </Group>
              {selectedTenant ? (
                <Table.ScrollContainer minWidth={760}>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>User</Table.Th>
                        <Table.Th>Tenant roles</Table.Th>
                        <Table.Th>Global roles</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {memberships.map((membership) => (
                        <Table.Tr key={`${membership.tenantId}-${membership.userUuid}`}>
                          <Table.Td>
                            <Text fw={600}>{membership.displayName}</Text>
                            <Text size="sm" c="dimmed">
                              {membership.email}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" wrap="wrap">
                              {membership.roles.map((role) => (
                                <Badge key={role} variant="light">
                                  {role}
                                </Badge>
                              ))}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" wrap="wrap">
                              {membership.globalRoles.length ? (
                                membership.globalRoles.map((role) => (
                                  <Badge key={role} color="grape" variant="light">
                                    {role}
                                  </Badge>
                                ))
                              ) : (
                                <Text size="sm" c="dimmed">
                                  None
                                </Text>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Badge
                              color={membership.status === 'active' ? 'moss' : 'red'}
                              variant="light"
                            >
                              {membership.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Button
                                size="xs"
                                variant="light"
                                onClick={() => onOpenEditMember(membership)}
                              >
                                {membership.globalRoles.includes('super_admin')
                                  ? 'Protected'
                                  : 'Edit member'}
                              </Button>
                              <Button
                                size="xs"
                                variant="subtle"
                                onClick={() => onOpenEditGlobalRoles(membership)}
                              >
                                Global access
                              </Button>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              ) : (
                <Text c="dimmed" size="sm">
                  Select a tenant to inspect its membership boundary.
                </Text>
              )}
              {selectedTenant && !memberships.length && !membershipsQuery.isPending ? (
                <Text c="dimmed" size="sm" mt="md">
                  This tenant has no memberships yet.
                </Text>
              ) : null}
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>

      <Modal opened={createOpened} onClose={onCloseCreate} title="Create tenant">
        <form onSubmit={handleCreateTenantSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Provision a new tenant isolation boundary with a stable slug and an
              explicit BYOK override policy.
            </Text>
            <TextInput
              label="Slug"
              placeholder="customer-acme"
              value={createSlug}
              onChange={(event) => onCreateSlugChange(event.currentTarget.value)}
            />
            <TextInput
              label="Display name"
              placeholder="Customer Acme"
              value={createDisplayName}
              onChange={(event) =>
                onCreateDisplayNameChange(event.currentTarget.value)
              }
            />
            <Switch
              checked={createAllowOverride}
              label="Allow user credential override"
              onChange={(event) =>
                onCreateAllowOverrideChange(event.currentTarget.checked)
              }
            />
            <Group justify="space-between">
              <Button onClick={onCloseCreate} type="button" variant="light">
                Cancel
              </Button>
              <Button
                loading={isCreatePending}
                type="submit"
                disabled={!createSlug.trim() || !createDisplayName.trim()}
              >
                Create tenant
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={createMemberOpened}
        onClose={onCloseCreateMember}
        title="Add tenant member"
      >
        <form onSubmit={handleCreateTenantUserSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Attach an existing global user by email, or provision a new global
              user and add it to this tenant with roles such as `tenant_admin`.
            </Text>
            <TextInput
              label="Display name"
              description="Optional when attaching an existing global user. Required only when provisioning a brand-new account."
              value={createMemberDisplayName}
              onChange={(event) =>
                onCreateMemberDisplayNameChange(event.currentTarget.value)
              }
            />
            <TextInput
              label="Email"
              type="email"
              value={createMemberEmail}
              onChange={(event) =>
                onCreateMemberEmailChange(event.currentTarget.value)
              }
            />
            <PasswordInput
              label="Temporary password"
              description="Optional when attaching an existing global user. Required only when provisioning a brand-new account."
              value={createMemberPassword}
              onChange={(event) =>
                onCreateMemberPasswordChange(event.currentTarget.value)
              }
            />
            <MultiSelect
              label="Tenant roles"
              value={createMemberRoles}
              onChange={onCreateMemberRolesChange}
              searchable={false}
              data={[
                { value: 'viewer', label: 'Viewer' },
                { value: 'user', label: 'User' },
                { value: 'operator', label: 'Operator' },
                { value: 'tenant_admin', label: 'Tenant admin' },
              ]}
            />
            <Group justify="space-between">
              <Button onClick={onCloseCreateMember} type="button" variant="light">
                Cancel
              </Button>
              <Button
                loading={isCreateTenantUserPending}
                type="submit"
                disabled={!createMemberEmail.trim()}
              >
                Add member
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editMemberOpened}
        onClose={onCloseEditMember}
        title="Edit tenant member"
      >
        <form onSubmit={handleUpdateTenantUserSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              {selectedMembershipIsProtected
                ? 'This account has the global super_admin role. Tenant workflows can inspect it, but cannot downgrade or disable it.'
                : 'Update tenant-scoped roles or disable the selected user account for this tenant workflow.'}
            </Text>
            {selectedMembership ? (
              <div>
                <Text fw={700}>{selectedMembership.displayName}</Text>
                <Text size="sm" c="dimmed">
                  {selectedMembership.email}
                </Text>
              </div>
            ) : null}
            <MultiSelect
              disabled={selectedMembershipIsProtected}
              label="Tenant roles"
              value={editMemberRoles}
              onChange={onEditMemberRolesChange}
              searchable={false}
              data={[
                { value: 'viewer', label: 'Viewer' },
                { value: 'user', label: 'User' },
                { value: 'operator', label: 'Operator' },
                { value: 'tenant_admin', label: 'Tenant admin' },
              ]}
            />
            <Select
              disabled={selectedMembershipIsProtected}
              label="Status"
              value={editMemberStatus}
              onChange={onEditMemberStatusChange}
              data={[
                { value: 'active', label: 'Active' },
                { value: 'disabled', label: 'Disabled' },
              ]}
            />
            <Group justify="space-between">
              <Button onClick={onCloseEditMember} type="button" variant="light">
                Cancel
              </Button>
              <Button
                loading={isUpdateTenantUserPending}
                type="submit"
                disabled={selectedMembershipIsProtected}
              >
                {selectedMembershipIsProtected ? 'Protected' : 'Save member'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        opened={editGlobalRolesOpened}
        onClose={onCloseEditGlobalRoles}
        title="Global access"
      >
        <form onSubmit={handleUpdateGlobalRolesSubmit}>
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Global roles are control-plane privileges and are managed
              separately from tenant memberships.
            </Text>
            {selectedMembership ? (
              <div>
                <Text fw={700}>{selectedMembership.displayName}</Text>
                <Text size="sm" c="dimmed">
                  {selectedMembership.email}
                </Text>
              </div>
            ) : null}
            {selectedMembershipIsSelf &&
            selectedMembership?.globalRoles.includes('super_admin') ? (
              <Alert color="grape" variant="light" title="Protected account">
                Your current session is using this `super_admin` account. You
                cannot remove your own global access from this screen.
              </Alert>
            ) : null}
            {updateGlobalRolesError ? (
              <Alert color="red" variant="light" title="Update failed">
                {updateGlobalRolesError}
              </Alert>
            ) : null}
            <MultiSelect
              label="Global roles"
              value={editGlobalRoles}
              onChange={onEditGlobalRolesChange}
              searchable={false}
              data={[{ value: 'super_admin', label: 'Super admin' }]}
            />
            <Group justify="space-between">
              <Button
                onClick={onCloseEditGlobalRoles}
                type="button"
                variant="light"
              >
                Cancel
              </Button>
              <Button loading={isUpdateGlobalRolesPending} type="submit">
                Save global access
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}

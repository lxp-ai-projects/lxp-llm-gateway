import {
  Button,
  Group,
  Modal,
  MultiSelect,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';

type CreateUserModalProps = {
  createDisplayName: string;
  createEmail: string;
  createPassword: string;
  createRoles: string[];
  isPending: boolean;
  opened: boolean;
  onClose: () => void;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRolesChange: (value: string[]) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
};

export function CreateUserModal({
  createDisplayName,
  createEmail,
  createPassword,
  createRoles,
  isPending,
  opened,
  onClose,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onRolesChange,
  onSubmit,
}: CreateUserModalProps) {
  const isSubmitDisabled =
    !createDisplayName.trim() ||
    !createEmail.trim() ||
    createPassword.length < 8;

  return (
    <Modal opened={opened} onClose={onClose} title="Create user">
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            Create a new platform account with the minimum credentials required
            to sign in.
          </Text>
          <TextInput
            data-testid="users-create-display-name"
            label="Display name"
            onChange={(event) => onDisplayNameChange(event.currentTarget.value)}
            placeholder="Emilie Joli"
            value={createDisplayName}
          />
          <TextInput
            data-testid="users-create-email"
            label="Email"
            onChange={(event) => onEmailChange(event.currentTarget.value)}
            placeholder="emilie@example.com"
            type="email"
            value={createEmail}
          />
          <PasswordInput
            data-testid="users-create-password"
            description="Minimum 8 characters."
            label="Temporary password"
            onChange={(event) => onPasswordChange(event.currentTarget.value)}
            value={createPassword}
          />
          <MultiSelect
            data={[
              { value: 'user', label: 'User' },
              { value: 'viewer', label: 'Viewer' },
              { value: 'operator', label: 'Operator' },
              { value: 'tenant_admin', label: 'Tenant admin' },
            ]}
            data-testid="users-create-roles"
            label="Roles"
            onChange={onRolesChange}
            searchable={false}
            value={createRoles}
          />
          <Group justify="space-between">
            <Button
              data-testid="users-create-cancel"
              onClick={onClose}
              type="button"
              variant="light"
            >
              Cancel
            </Button>
            <Button
              data-testid="users-create-submit"
              disabled={isSubmitDisabled}
              loading={isPending}
              type="submit"
            >
              Create user
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

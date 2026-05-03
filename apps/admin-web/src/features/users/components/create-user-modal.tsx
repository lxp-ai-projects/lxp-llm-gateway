import {
  ActionIcon,
  Button,
  Group,
  Modal,
  MultiSelect,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { IconHelpCircle } from '@tabler/icons-react';

function HelpLabel({
  label,
  help,
}: {
  label: string;
  help: string;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Text component="span" inherit>
        {label}
      </Text>
      <Tooltip label={help} multiline w={260} withArrow>
        <ActionIcon
          aria-label={`Help for ${label}`}
          color="gray"
          radius="xl"
          size="sm"
          variant="subtle"
        >
          <IconHelpCircle size={16} stroke={1.8} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

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
            label={
              <HelpLabel
                label="Display name"
                help="Shown in the admin UI and used to identify the person behind this global account."
              />
            }
            onChange={(event) => onDisplayNameChange(event.currentTarget.value)}
            placeholder="Emilie Joli"
            value={createDisplayName}
          />
          <TextInput
            data-testid="users-create-email"
            label={
              <HelpLabel
                label="Email"
                help="The global login identity. If this email already exists, the user will be attached to the tenant instead of recreated."
              />
            }
            onChange={(event) => onEmailChange(event.currentTarget.value)}
            placeholder="emilie@example.com"
            type="email"
            value={createEmail}
          />
          <PasswordInput
            data-testid="users-create-password"
            description="Minimum 8 characters."
            label={
              <HelpLabel
                label="Temporary password"
                help="Only required when provisioning a brand-new global account. Existing users keep their current password."
              />
            }
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
            label={
              <HelpLabel
                label="Roles"
                help="Global or tenant-scoped starting roles assigned when the account is created."
              />
            }
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

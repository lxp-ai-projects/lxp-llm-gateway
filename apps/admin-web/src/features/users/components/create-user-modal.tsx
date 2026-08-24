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
import { useTranslation } from 'react-i18next';

function HelpLabel({ label, help }: { label: string; help: string }) {
  const { t } = useTranslation('users');
  return (
    <Group gap={6} wrap="nowrap">
      <Text component="span" inherit>
        {label}
      </Text>
      <Tooltip label={help} multiline w={260} withArrow>
        <ActionIcon
          aria-label={t('create.helpFor', { label })}
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
  const { t } = useTranslation('users');
  const isSubmitDisabled =
    !createDisplayName.trim() ||
    !createEmail.trim() ||
    createPassword.length < 8;

  return (
    <Modal opened={opened} onClose={onClose} title={t('create.title')}>
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Text c="dimmed" size="sm">
            {t('create.description')}
          </Text>
          <TextInput
            data-testid="users-create-display-name"
            label={
              <HelpLabel
                label={t('create.displayName')}
                help={t('create.displayNameHelp')}
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
                label={t('create.email')}
                help={t('create.emailHelp')}
              />
            }
            onChange={(event) => onEmailChange(event.currentTarget.value)}
            placeholder="emilie@example.com"
            type="email"
            value={createEmail}
          />
          <PasswordInput
            data-testid="users-create-password"
            description={t('create.passwordDescription')}
            label={
              <HelpLabel
                label={t('create.temporaryPassword')}
                help={t('create.temporaryPasswordHelp')}
              />
            }
            onChange={(event) => onPasswordChange(event.currentTarget.value)}
            value={createPassword}
          />
          <MultiSelect
            data={[
              { value: 'user', label: t('directory.roles.user') },
              { value: 'viewer', label: t('directory.roles.viewer') },
              { value: 'operator', label: t('directory.roles.operator') },
              {
                value: 'tenant_admin',
                label: t('directory.roles.tenant_admin'),
              },
            ]}
            data-testid="users-create-roles"
            label={
              <HelpLabel
                label={t('create.roles')}
                help={t('create.rolesHelp')}
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
              {t('create.cancel')}
            </Button>
            <Button
              data-testid="users-create-submit"
              disabled={isSubmitDisabled}
              loading={isPending}
              type="submit"
            >
              {t('create.submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

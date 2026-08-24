import { Card, Modal, SimpleGrid, Stack, Table, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import type { ProviderCredentialSummary } from '../../../lib/api-client';

type ProviderCredentialsModalProps = {
  credentials: ProviderCredentialSummary[];
  opened: boolean;
  onClose: () => void;
  userDisplayName: string | null;
};

export function ProviderCredentialsModal({
  credentials,
  opened,
  onClose,
  userDisplayName,
}: ProviderCredentialsModalProps) {
  const { t } = useTranslation('users');
  return (
    <Modal
      data-testid="users-provider-credentials-modal"
      opened={opened}
      onClose={onClose}
      title={
        userDisplayName
          ? t('credentials.titleWithUser', { user: userDisplayName })
          : t('credentials.title')
      }
    >
      <div
        className="provider-credentials-cards"
        aria-label={t('credentials.mobileCards')}
      >
        <Stack gap="sm">
          {credentials.map((credential) => (
            <Card
              key={credential.id}
              className="provider-credential-card"
              padding="md"
              radius="lg"
              withBorder
            >
              <Stack gap="sm">
                <div>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                    {t('credentials.provider')}
                  </Text>
                  <Text fw={600} mt={4}>
                    {credential.providerDisplayName}
                  </Text>
                </div>
                <SimpleGrid cols={2} spacing="sm" verticalSpacing="sm">
                  <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                      {t('credentials.label')}
                    </Text>
                    <Text mt={4}>{credential.label}</Text>
                  </div>
                  <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                      {t('credentials.maskedValue')}
                    </Text>
                    <Text mt={4}>
                      {credential.maskedHint ?? t('credentials.hidden')}
                    </Text>
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
              <Table.Th>{t('credentials.provider')}</Table.Th>
              <Table.Th>{t('credentials.label')}</Table.Th>
              <Table.Th>{t('credentials.maskedValue')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {credentials.map((credential) => (
              <Table.Tr key={credential.id}>
                <Table.Td>{credential.providerDisplayName}</Table.Td>
                <Table.Td>{credential.label}</Table.Td>
                <Table.Td>
                  {credential.maskedHint ?? t('credentials.hidden')}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Modal>
  );
}

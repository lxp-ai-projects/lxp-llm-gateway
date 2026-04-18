import { Card, Modal, SimpleGrid, Stack, Table, Text } from '@mantine/core';

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
  return (
    <Modal
      data-testid="users-provider-credentials-modal"
      opened={opened}
      onClose={onClose}
      title={`Provider credentials${userDisplayName ? `: ${userDisplayName}` : ''}`}
    >
      <div className="provider-credentials-cards" aria-label="Mobile provider credentials">
        <Stack gap="sm">
          {credentials.map((credential) => (
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
            {credentials.map((credential) => (
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
  );
}

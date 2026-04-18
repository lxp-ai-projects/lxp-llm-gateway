import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';

import type { ProviderCredentialSummary } from '../../../lib/api-client';

type ProviderCredentialsPanelProps = {
  credentials: ProviderCredentialSummary[];
  currentDefaultModel: string | null;
  currentDefaultProviderDisplayName: string | null;
  currentDefaultProviderId: string | null;
  onEditCredential: (credential: {
    id: string;
    providerId: string;
    label: string;
  }) => void;
};

export function ProviderCredentialsPanel({
  credentials,
  currentDefaultModel,
  currentDefaultProviderDisplayName,
  currentDefaultProviderId,
  onEditCredential,
}: ProviderCredentialsPanelProps) {
  function renderCredentialEditAction(credential: {
    id: string;
    providerId: string;
    label: string;
  }) {
    return (
      <Button
        data-testid={`providers-edit-credential-${credential.id}`}
        leftSection={<IconEdit size={14} />}
        onClick={() => onEditCredential(credential)}
        size="xs"
        variant="light"
      >
        Edit
      </Button>
    );
  }

  return (
    <Card className="section-card">
      <Stack gap="sm">
        <Title order={3}>My credentials</Title>
        <div className="provider-credentials-mobile">
          <Accordion
            variant="separated"
            radius="lg"
            className="provider-credentials-accordion"
          >
            {credentials.map((credential) => (
              <Accordion.Item
                key={credential.id}
                value={credential.id}
                className="provider-credential-accordion-item"
              >
                <Accordion.Control>
                  <Group
                    justify="space-between"
                    gap="sm"
                    wrap="nowrap"
                    className="provider-credential-summary"
                  >
                    <div className="provider-credential-summary-copy">
                      <Text fw={700}>{credential.providerDisplayName}</Text>
                      <Text size="sm" c="dimmed">
                        {credential.label}
                      </Text>
                    </div>
                    <Badge
                      color={credential.isActive ? 'moss' : 'gray'}
                      variant="light"
                    >
                      {credential.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="sm">
                    <SimpleGrid cols={2} spacing="sm" verticalSpacing="sm">
                      <div>
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                          Masked value
                        </Text>
                        <Text mt={4}>{credential.maskedHint ?? 'Hidden'}</Text>
                      </div>
                      <div>
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                          Status
                        </Text>
                        <Text mt={4}>
                          {credential.isActive ? 'Active' : 'Disabled'}
                        </Text>
                      </div>
                    </SimpleGrid>
                    {currentDefaultProviderId === credential.providerId ? (
                      <Alert
                        color="teal"
                        variant="light"
                        title="Default provider"
                      >
                        This provider is currently used as the default gateway
                        provider.
                      </Alert>
                    ) : null}
                    <Group justify="flex-start">
                      {renderCredentialEditAction(credential)}
                    </Group>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </div>
        <Table highlightOnHover className="provider-credentials-desktop-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Provider</Table.Th>
              <Table.Th>Label</Table.Th>
              <Table.Th>Masked value</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {credentials.map((credential) => (
              <Table.Tr key={credential.id}>
                <Table.Td>
                  <Stack gap={2}>
                    <Text>{credential.providerDisplayName}</Text>
                    {currentDefaultProviderId === credential.providerId ? (
                      <Text c="dimmed" size="xs">
                        Default provider
                      </Text>
                    ) : null}
                  </Stack>
                </Table.Td>
                <Table.Td>{credential.label}</Table.Td>
                <Table.Td>{credential.maskedHint ?? 'Hidden'}</Table.Td>
                <Table.Td>
                  {credential.isActive ? 'Active' : 'Disabled'}
                </Table.Td>
                <Table.Td>{renderCredentialEditAction(credential)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {!credentials.length ? (
          <Text c="dimmed" size="sm">
            No credentials saved yet. Add one before setting gateway defaults.
          </Text>
        ) : null}

        {currentDefaultProviderId ? (
          <Alert color="teal" title="Current gateway defaults">
            Provider: {currentDefaultProviderDisplayName}
            <br />
            Model: {currentDefaultModel ?? 'None configured'}
          </Alert>
        ) : null}
      </Stack>
    </Card>
  );
}

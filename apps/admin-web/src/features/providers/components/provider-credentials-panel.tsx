import { useTranslation } from 'react-i18next';
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';

import type { ProviderCredentialSummary } from '../../../lib/api-client';

type ProviderCredentialsPanelProps = {
  credentials: ProviderCredentialSummary[];
  currentDefaultModel: string | null;
  currentDefaultProviderDisplayName: string | null;
  currentDefaultProviderId: string | null;
  currentDefaultImageModel: string | null;
  currentDefaultImageProviderDisplayName: string | null;
  currentDefaultImageProviderId: string | null;
  credentialDeleteTarget: ProviderCredentialSummary | null;
  deleteCredentialError: string | null;
  deleteCredentialSuccessMessage: string | null;
  isDeleteCredentialPending: boolean;
  onCancelDeleteCredential: () => void;
  onConfirmDeleteCredential: (credential: ProviderCredentialSummary) => void;
  onDeleteCredential: () => void;
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
  currentDefaultImageModel,
  currentDefaultImageProviderDisplayName,
  currentDefaultImageProviderId,
  credentialDeleteTarget,
  deleteCredentialError,
  deleteCredentialSuccessMessage,
  isDeleteCredentialPending,
  onCancelDeleteCredential,
  onConfirmDeleteCredential,
  onDeleteCredential,
  onEditCredential,
}: ProviderCredentialsPanelProps) {
  const { t } = useTranslation('providers');
  function renderCredentialActions(credential: {
    id: string;
    providerId: string;
    label: string;
  }) {
    const disableActions = isDeleteCredentialPending;
    const matchingCredential =
      credentials.find((entry) => entry.id === credential.id) ?? null;

    return (
      <Group gap="xs">
        <Button
          data-testid={`providers-edit-credential-${credential.id}`}
          disabled={disableActions}
          leftSection={<IconEdit size={14} />}
          onClick={() => onEditCredential(credential)}
          size="xs"
          variant="light"
        >
          {t('providerCredentialsPanel.edit')}
        </Button>
        <Button
          color="red"
          data-testid={`providers-delete-credential-${credential.id}`}
          disabled={disableActions || matchingCredential === null}
          leftSection={<IconTrash size={14} />}
          onClick={() => {
            if (matchingCredential) {
              onConfirmDeleteCredential(matchingCredential);
            }
          }}
          size="xs"
          variant="subtle"
        >
          {t('providerCredentialsPanel.delete')}
        </Button>
      </Group>
    );
  }

  return (
    <Card className="section-card">
      <Stack gap="sm">
        <Title order={3}>{t('providerCredentialsPanel.myCredentials')}</Title>
        {deleteCredentialSuccessMessage ? (
          <Alert
            color="teal"
            title={t('providerCredentialsPanel.credentialDeleted')}
          >
            {deleteCredentialSuccessMessage}
          </Alert>
        ) : null}
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
                      <Group gap="xs">
                        <Text fw={700}>{credential.providerDisplayName}</Text>
                        {credential.providerId === 'ollama' ? (
                          <Badge color="blue" variant="light">
                            {t('providerCredentialsPanel.endpoint')}
                          </Badge>
                        ) : null}
                      </Group>
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
                          {t('providerCredentialsPanel.maskedValue')}
                        </Text>
                        <Text mt={4}>{credential.maskedHint ?? 'Hidden'}</Text>
                      </div>
                      <div>
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                          {t('providerCredentialsPanel.status')}
                        </Text>
                        <Text mt={4}>
                          {credential.isActive ? 'Active' : 'Disabled'}
                        </Text>
                      </div>
                    </SimpleGrid>
                    {currentDefaultProviderId === credential.providerId ||
                    currentDefaultImageProviderId === credential.providerId ? (
                      <Alert
                        color="teal"
                        variant="light"
                        title={t('providerCredentialsPanel.gatewayDefault')}
                      >
                        {currentDefaultProviderId === credential.providerId
                          ? 'Used by gateway chat defaults.'
                          : null}
                        {currentDefaultProviderId === credential.providerId &&
                        currentDefaultImageProviderId === credential.providerId
                          ? ' '
                          : null}
                        {currentDefaultImageProviderId === credential.providerId
                          ? 'Used by gateway image defaults.'
                          : null}
                      </Alert>
                    ) : null}
                    <Group justify="flex-start">
                      {renderCredentialActions(credential)}
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
              <Table.Th>{t('providerCredentialsPanel.provider')}</Table.Th>
              <Table.Th>{t('providerCredentialsPanel.label')}</Table.Th>
              <Table.Th>{t('providerCredentialsPanel.maskedValue')}</Table.Th>
              <Table.Th>{t('providerCredentialsPanel.status')}</Table.Th>
              <Table.Th>{t('providerCredentialsPanel.actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {credentials.map((credential) => (
              <Table.Tr key={credential.id}>
                <Table.Td>
                  <Stack gap={2}>
                    <Group gap="xs">
                      <Text>{credential.providerDisplayName}</Text>
                      {credential.providerId === 'ollama' ? (
                        <Badge color="blue" variant="light">
                          {t('providerCredentialsPanel.endpoint')}
                        </Badge>
                      ) : null}
                    </Group>
                    {currentDefaultProviderId === credential.providerId ? (
                      <Text c="dimmed" size="xs">
                        {t('providerCredentialsPanel.chatDefaultProvider')}
                      </Text>
                    ) : null}
                    {currentDefaultImageProviderId === credential.providerId ? (
                      <Text c="dimmed" size="xs">
                        {t('providerCredentialsPanel.imageDefaultProvider')}
                      </Text>
                    ) : null}
                  </Stack>
                </Table.Td>
                <Table.Td>{credential.label}</Table.Td>
                <Table.Td>{credential.maskedHint ?? 'Hidden'}</Table.Td>
                <Table.Td>
                  {credential.isActive ? 'Active' : 'Disabled'}
                </Table.Td>
                <Table.Td>{renderCredentialActions(credential)}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        {!credentials.length ? (
          <Text c="dimmed" size="sm">
            {t('providerCredentialsPanel.noCredentialsSavedYetAddOneBefore')}
          </Text>
        ) : null}

        {currentDefaultProviderId || currentDefaultImageProviderId ? (
          <Alert
            color="teal"
            title={t('providerCredentialsPanel.currentGatewayDefaults')}
          >
            {t('providerCredentialsPanel.chatProviderValue', {
              value:
                currentDefaultProviderDisplayName ??
                t('providerCredentialsPanel.noneConfigured'),
            })}
            <br />
            {t('providerCredentialsPanel.chatModelValue', {
              value:
                currentDefaultModel ??
                t('providerCredentialsPanel.noneConfigured'),
            })}
            <br />
            {t('providerCredentialsPanel.imageProviderValue', {
              value:
                currentDefaultImageProviderDisplayName ??
                t('providerCredentialsPanel.noneConfigured'),
            })}
            <br />
            {t('providerCredentialsPanel.imageModelValue', {
              value:
                currentDefaultImageModel ??
                t('providerCredentialsPanel.noneConfigured'),
            })}
          </Alert>
        ) : null}
      </Stack>
      <Modal
        centered
        onClose={
          isDeleteCredentialPending ? () => undefined : onCancelDeleteCredential
        }
        opened={credentialDeleteTarget !== null}
        title={t('providerCredentialsPanel.deleteCredential')}
      >
        <Stack data-testid="providers-delete-credential-modal" gap="sm">
          <Text>
            {t('providerCredentialsPanel.deleteTheCredentialFor')}{' '}
            <Text component="span" fw={700}>
              {credentialDeleteTarget?.providerDisplayName ??
                'Unknown provider'}
            </Text>{' '}
            {t('providerCredentialsPanel.withLabel')}{' '}
            <Text component="span" fw={700}>
              {credentialDeleteTarget?.label ?? 'Unknown label'}
            </Text>
            ?
          </Text>
          <Alert
            color="red"
            title={t('providerCredentialsPanel.impact')}
            variant="light"
          >
            {t('providerCredentialsPanel.thisProviderMayStopWorkingUntilA')}
          </Alert>
          {deleteCredentialError ? (
            <Alert
              color="red"
              title={t('providerCredentialsPanel.unableToDeleteCredential')}
            >
              {deleteCredentialError}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button
              disabled={isDeleteCredentialPending}
              onClick={onCancelDeleteCredential}
              type="button"
              variant="subtle"
            >
              {t('providerCredentialsPanel.cancel')}
            </Button>
            <Button
              color="red"
              data-testid="providers-delete-credential-confirm"
              loading={isDeleteCredentialPending}
              onClick={onDeleteCredential}
              type="button"
            >
              {t('providerCredentialsPanel.deleteCredential')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

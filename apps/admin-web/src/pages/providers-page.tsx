import {
  Alert,
  Button,
  Card,
  Grid,
  Group,
  PasswordInput,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconKey } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { PageHeader } from '../components/page-header';
import { adminApiClient } from '../lib/api-client';

export function ProvidersPage() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('primary');
  const [apiToken, setApiToken] = useState('');
  const credentialsQuery = useQuery({
    queryKey: ['own-provider-credentials'],
    queryFn: () => adminApiClient.getOwnProviderCredentials(),
  });
  const createMutation = useMutation({
    mutationFn: () =>
      adminApiClient.createOwnProviderCredential({
        providerId: 'nanogpt',
        label,
        apiToken,
      }),
    onSuccess: async () => {
      setApiToken('');
      setLabel('primary');
      await queryClient.invalidateQueries({ queryKey: ['own-provider-credentials'] });
    },
  });

  return (
    <>
      <PageHeader
        title="Provider Tokens"
        description="Manage supported provider credentials with clear security boundaries between write, reset, and read operations."
      />
      <Grid>
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card className="section-card">
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={3}>Add provider credential</Title>
                <IconKey size={18} />
              </Group>
              <Text c="dimmed" size="sm">
                The token value is write-only. After creation, only a masked hint is visible in the UI.
              </Text>
              <TextInput label="Label" onChange={(event) => setLabel(event.currentTarget.value)} value={label} />
              <PasswordInput
                label="NanoGPT API token"
                onChange={(event) => setApiToken(event.currentTarget.value)}
                value={apiToken}
              />
              <Button
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={!label.trim() || !apiToken.trim()}
              >
                Save credential
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card className="section-card">
            <Stack gap="sm">
              <Title order={3}>My credentials</Title>
              <Table highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Provider</Table.Th>
                    <Table.Th>Label</Table.Th>
                    <Table.Th>Masked value</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(credentialsQuery.data ?? []).map((credential) => (
                    <Table.Tr key={credential.id}>
                      <Table.Td>{credential.providerDisplayName}</Table.Td>
                      <Table.Td>{credential.label}</Table.Td>
                      <Table.Td>{credential.maskedHint ?? 'Hidden'}</Table.Td>
                      <Table.Td>{credential.isActive ? 'Active' : 'Disabled'}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
      <Alert color="blue" mt="lg" title="Boundary reminder">
        Administrators may create or reset another user provider credential, but they should only ever see the
        masked version of another user secret, never the raw token.
      </Alert>
    </>
  );
}

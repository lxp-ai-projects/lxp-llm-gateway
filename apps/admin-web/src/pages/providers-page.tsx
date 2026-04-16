import { Alert, Card, Grid, Group, Stack, Text, Title } from '@mantine/core';
import { IconKey } from '@tabler/icons-react';

import { PageHeader } from '../components/page-header';
import { useRuntimeConfig } from '../lib/use-runtime-config';

export function ProvidersPage() {
  const runtimeConfigQuery = useRuntimeConfig();

  return (
    <>
      <PageHeader
        title="Provider Tokens"
        description="Manage supported provider credentials with clear security boundaries between write, reset, and read operations."
      />
      <Grid>
        {(runtimeConfigQuery.data?.supportedProviders ?? []).map((provider) => (
          <Grid.Col key={provider.providerId} span={{ base: 12, md: 6 }}>
            <Card className="section-card">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={3}>{provider.displayName}</Title>
                  <IconKey size={18} />
                </Group>
                <Text c="dimmed" size="sm">
                  Provider credentials are write-only. Existing secret values are never returned to the UI.
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
      <Alert color="blue" mt="lg" title="Backend integration pending">
        The provider credential management shell is ready. Form submission and admin reset semantics should be
        wired once the dedicated CRUD endpoints are exposed.
      </Alert>
    </>
  );
}

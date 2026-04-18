import { Card, Stack, Text, Title } from '@mantine/core';

export function LoginHeroCard() {
  return (
    <Card className="hero-card auth-story">
      <Stack gap="xl">
        <div>
          <Text className="page-kicker">Secure control plane</Text>
          <Title order={1}>Operate the gateway without softening the security posture.</Title>
          <Text c="dimmed" mt="md" size="lg">
            Role-aware navigation, encrypted provider secrets, and browser auth carried entirely by
            `HttpOnly` cookies.
          </Text>
        </div>
        <div className="hero-highlight">
          <Text fw={700}>Phase 1 experience</Text>
          <Text c="dimmed" mt="xs">
            Admins see operational controls and user management. Standard users see only what they
            need to manage provider access and validate model behavior.
          </Text>
        </div>
      </Stack>
    </Card>
  );
}

import { Badge, Stack, Text, Title } from '@mantine/core';

export function AuthBrandPanel() {
  return (
    <section className="auth-brand-panel" aria-labelledby="auth-brand-title">
      <Stack gap="xl">
        <div className="auth-brand-mark" aria-label="LXP">
          LXP
        </div>
        <div>
          <Badge className="auth-brand-badge" variant="light">
            LXP gateway
          </Badge>
          <Title id="auth-brand-title" order={1}>
            A clearer path from intent to intelligence.
          </Title>
          <Text className="auth-brand-copy" mt="md" size="lg">
            A focused workspace for managing model access, credentials, and the
            systems your team relies on.
          </Text>
        </div>
        <div className="auth-brand-note">
          <span className="auth-brand-note-dot" />
          <Text size="sm">Secure workspace access</Text>
        </div>
      </Stack>
    </section>
  );
}

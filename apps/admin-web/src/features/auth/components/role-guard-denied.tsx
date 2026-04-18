import { Alert, Container, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';

export function RoleGuardDenied() {
  return (
    <Container size="lg">
      <Title order={2} mb="md">
        Restricted surface
      </Title>
      <Alert
        icon={<IconLock size={18} />}
        color="red"
        title="Administrator access required"
      >
        Your current role does not allow access to this section.
      </Alert>
    </Container>
  );
}

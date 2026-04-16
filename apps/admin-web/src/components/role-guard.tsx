import { Alert, Container, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import type { PropsWithChildren } from 'react';

import { useSession } from '../lib/use-session';

type RoleGuardProps = PropsWithChildren<{
  allowedRoles: string[];
}>;

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const currentRoles = useSession().data?.roles ?? [];
  const authorized = allowedRoles.some((role) => currentRoles.includes(role));

  if (!authorized) {
    return (
      <Container size="lg">
        <Title order={2} mb="md">
          Restricted surface
        </Title>
        <Alert icon={<IconLock size={18} />} color="red" title="Administrator access required">
          Your current role does not allow access to this section.
        </Alert>
      </Container>
    );
  }

  return children;
}

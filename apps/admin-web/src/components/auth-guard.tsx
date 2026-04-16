import { Center, Loader, Stack, Text } from '@mantine/core';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useSession } from '../lib/use-session';

export function AuthGuard({ children }: PropsWithChildren) {
  const location = useLocation();
  const sessionQuery = useSession();

  if (sessionQuery.isPending) {
    return (
      <Center mih="100vh">
        <Stack align="center" gap="sm">
          <Loader color="teal" />
          <Text c="dimmed">Restoring secure session...</Text>
        </Stack>
      </Center>
    );
  }

  if (!sessionQuery.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

import { Center, Loader, Stack, Text } from '@mantine/core';

export function AuthGuardLoading() {
  return (
    <Center mih="100vh">
      <Stack align="center" gap="sm">
        <Loader color="teal" />
        <Text c="dimmed">Restoring secure session...</Text>
      </Stack>
    </Center>
  );
}

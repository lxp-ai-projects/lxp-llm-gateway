import { Center, Loader, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function AuthGuardLoading() {
  const { t } = useTranslation('auth');
  return (
    <Center mih="100vh">
      <Stack align="center" gap="sm">
        <Loader color="teal" />
        <Text c="dimmed">{t('session.restoring')}</Text>
      </Stack>
    </Center>
  );
}

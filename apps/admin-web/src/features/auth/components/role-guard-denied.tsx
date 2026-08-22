import { Alert, Container, Title } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function RoleGuardDenied() {
  const { t } = useTranslation('auth');
  return (
    <Container size="lg">
      <Title order={2} mb="md">
        {t('denied.title')}
      </Title>
      <Alert
        icon={<IconLock size={18} />}
        color="red"
        title={t('denied.alertTitle')}
      >
        {t('denied.description')}
      </Alert>
    </Container>
  );
}

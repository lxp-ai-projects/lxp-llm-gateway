import {
  Alert,
  Button,
  Card,
  Center,
  Container,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconUserOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useRuntimeConfig } from '../lib/use-runtime-config';

export function RegistrationPage() {
  const { t } = useTranslation('pages');
  const runtimeConfigQuery = useRuntimeConfig();

  return (
    <Center mih="100vh" px="md">
      <Container size={520} w="100%">
        <Card className="hero-card">
          <Stack gap="lg">
            <div>
              <Text className="page-kicker">{t('pending.registrationKicker')}</Text>
              <Title order={1}>{t('pending.registrationTitle')}</Title>
            </div>
            {runtimeConfigQuery.data?.registrationEnabled ? (
              <Alert color="blue" title={t('pending.backendFlow')}>
                {t('pending.registrationPending')}
              </Alert>
            ) : (
              <Alert
                color="red"
                icon={<IconUserOff size={18} />}
                title={t('pending.disabledTitle')}
              >
                {t('pending.registrationDisabled')}
              </Alert>
            )}
            <Button component={Link} to="/login" variant="light">
              {t('legal.back')}
            </Button>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}

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
import { IconMailOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useRuntimeConfig } from '../lib/use-runtime-config';

export function ForgotPasswordPage() {
  const { t } = useTranslation('pages');
  const runtimeConfigQuery = useRuntimeConfig();

  return (
    <Center mih="100vh" px="md">
      <Container size={520} w="100%">
        <Card className="hero-card">
          <Stack gap="lg">
            <div>
              <Text className="page-kicker">{t('pending.recoveryKicker')}</Text>
              <Title order={1}>{t('pending.recoveryTitle')}</Title>
              <Text c="dimmed" mt="sm">
                {t('pending.recoveryDescription')}
              </Text>
            </div>
            {runtimeConfigQuery.data?.forgotPasswordEnabled ? (
              <Alert color="blue" title={t('pending.backendEndpoint')}>
                {t('pending.recoveryPending')}
              </Alert>
            ) : (
              <Alert
                color="red"
                icon={<IconMailOff size={18} />}
                title={t('pending.disabledTitle')}
              >
                {t('pending.recoveryDisabled')}
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

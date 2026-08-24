import {
  Button,
  Card,
  Center,
  Container,
  List,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function PrivacyPage() {
  const { t } = useTranslation('pages');
  return (
    <Center mih="100vh" px="md">
      <Container size={720} w="100%">
        <Card className="hero-card">
          <Stack gap="lg">
            <div>
              <Text className="page-kicker">{t('legal.privacyKicker')}</Text>
              <Title order={1}>{t('legal.privacyTitle')}</Title>
            </div>
            <Text c="dimmed">
              {t('legal.privacyDescription')}
            </Text>
            <List spacing="sm">
              <List.Item>{t('legal.privacySecrets')}</List.Item>
              <List.Item>
                {t('legal.privacySessions')}
              </List.Item>
              <List.Item>
                {t('legal.privacyIdentity')}
              </List.Item>
            </List>
            <Button component={Link} to="/login" variant="light">
              {t('legal.back')}
            </Button>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
}

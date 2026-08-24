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

export function TermsPage() {
  const { t } = useTranslation('pages');
  return (
    <Center mih="100vh" px="md">
      <Container size={720} w="100%">
        <Card className="hero-card">
          <Stack gap="lg">
            <div>
              <Text className="page-kicker">{t('legal.termsKicker')}</Text>
              <Title order={1}>{t('legal.termsTitle')}</Title>
            </div>
            <Text c="dimmed">
              {t('legal.termsDescription')}
            </Text>
            <List spacing="sm">
              <List.Item>
                {t('legal.termsCredential')}
              </List.Item>
              <List.Item>
                {t('legal.termsAdmin')}
              </List.Item>
              <List.Item>
                {t('legal.termsGateway')}
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

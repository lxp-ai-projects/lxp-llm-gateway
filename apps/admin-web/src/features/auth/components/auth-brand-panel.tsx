import { Badge, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function AuthBrandPanel() {
  const { t } = useTranslation('auth');
  return (
    <section className="auth-brand-panel" aria-labelledby="auth-brand-title">
      <Stack gap="xl">
        <div>
          <Badge className="auth-brand-badge" variant="light">
            {t('brand.badge')}
          </Badge>
          <Title id="auth-brand-title" order={1}>
            {t('brand.title')}
          </Title>
          <Text className="auth-brand-copy" mt="md" size="lg">
            {t('brand.description')}
          </Text>
        </div>
        <div className="auth-brand-note">
          <span className="auth-brand-note-dot" />
          <Text size="sm">{t('brand.secureAccess')}</Text>
        </div>
      </Stack>
    </section>
  );
}

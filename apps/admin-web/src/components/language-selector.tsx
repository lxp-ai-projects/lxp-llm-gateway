import { Select } from '@mantine/core';
import { useTranslation } from 'react-i18next';

import { localeMetadata, normalizeLocale, supportedLocales } from '../i18n/locales';

type LanguageSelectorProps = { compact?: boolean };

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation('common');
  const value = normalizeLocale(i18n.resolvedLanguage ?? i18n.language) ?? 'en';

  return (
    <Select
      aria-label={t('language.select')}
      data={supportedLocales.map((locale) => ({ value: locale, label: localeMetadata[locale].label }))}
      label={compact ? undefined : t('language.label')}
      onChange={(locale) => { if (locale) void i18n.changeLanguage(locale); }}
      size="xs"
      value={value}
      w={compact ? 150 : '100%'}
    />
  );
}

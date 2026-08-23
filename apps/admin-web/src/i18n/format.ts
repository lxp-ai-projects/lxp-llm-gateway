import i18n from './index';
import type { SupportedLocale } from './locales';

function activeLocale(): SupportedLocale {
  return (i18n.resolvedLanguage ?? i18n.language ?? 'en') as SupportedLocale;
}

export function formatDateTime(
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(activeLocale(), options).format(
    new Date(value),
  );
}

export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(activeLocale(), options).format(value);
}

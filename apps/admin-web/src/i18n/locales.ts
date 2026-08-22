export const supportedLocales = ['en', 'fr', 'es', 'de'] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const localeStorageKey = 'lxp.locale';

export const localeMetadata: Record<SupportedLocale, { label: string }> = {
  en: { label: 'English' },
  fr: { label: 'Français' },
  es: { label: 'Español' },
  de: { label: 'Deutsch' },
};

export function normalizeLocale(locale: string | null | undefined): SupportedLocale | null {
  if (!locale) return null;
  const language = locale.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.find((candidate) => candidate === language) ?? null;
}

export function resolveLocale(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
  browserLocales: readonly string[] = globalThis.navigator?.languages ?? [],
): SupportedLocale {
  const savedLocale = normalizeLocale(storage?.getItem(localeStorageKey));
  if (savedLocale) return savedLocale;

  for (const browserLocale of browserLocales) {
    const locale = normalizeLocale(browserLocale);
    if (locale) return locale;
  }

  return 'en';
}

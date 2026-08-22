import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { localeStorageKey, normalizeLocale, resolveLocale } from './locales';
import { de } from './resources/de';
import { en } from './resources/en';
import { es } from './resources/es';
import { fr } from './resources/fr';

export const resources = { en, fr, es, de } as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveLocale(),
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
  showSupportNotice: false,
});

function synchronizeDocumentLanguage(language: string) {
  const locale = normalizeLocale(language) ?? 'en';
  document.documentElement.lang = locale;
}

synchronizeDocumentLanguage(i18n.language);
i18n.on('languageChanged', (language) => {
  const locale = normalizeLocale(language) ?? 'en';
  globalThis.localStorage?.setItem(localeStorageKey, locale);
  synchronizeDocumentLanguage(locale);
});

export default i18n;

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { localeStorageKey, normalizeLocale, resolveLocale } from './locales';
import { de } from './resources/de';
import { en } from './resources/en';
import { es } from './resources/es';
import { fr } from './resources/fr';
import chatEn from './generated/chat.en.json';
import chatFr from './generated/chat.fr.json';
import chatEs from './generated/chat.es.json';
import chatDe from './generated/chat.de.json';
import imageEn from './generated/image.en.json';
import imageFr from './generated/image.fr.json';
import imageEs from './generated/image.es.json';
import imageDe from './generated/image.de.json';
import videoEn from './generated/video.en.json';
import videoFr from './generated/video.fr.json';
import videoEs from './generated/video.es.json';
import videoDe from './generated/video.de.json';
import providersEn from './generated/providers.en.json';
import providersFr from './generated/providers.fr.json';
import providersEs from './generated/providers.es.json';
import providersDe from './generated/providers.de.json';
import profileEn from './generated/profile.en.json';
import profileFr from './generated/profile.fr.json';
import profileEs from './generated/profile.es.json';
import profileDe from './generated/profile.de.json';
import evaluationEn from './generated/evaluation.en.json';
import evaluationFr from './generated/evaluation.fr.json';
import evaluationEs from './generated/evaluation.es.json';
import evaluationDe from './generated/evaluation.de.json';
import tenantsEn from './generated/tenants.en.json';
import tenantsFr from './generated/tenants.fr.json';
import tenantsEs from './generated/tenants.es.json';
import tenantsDe from './generated/tenants.de.json';

export const resources = {
  en: {
    ...en,
    chat: chatEn,
    image: imageEn,
    video: videoEn,
    providers: providersEn,
    profile: profileEn,
    evaluation: evaluationEn,
    tenants: tenantsEn,
  },
  fr: {
    ...fr,
    chat: chatFr,
    image: imageFr,
    video: videoFr,
    providers: providersFr,
    profile: profileFr,
    evaluation: evaluationFr,
    tenants: tenantsFr,
  },
  es: {
    ...es,
    chat: chatEs,
    image: imageEs,
    video: videoEs,
    providers: providersEs,
    profile: profileEs,
    evaluation: evaluationEs,
    tenants: tenantsEs,
  },
  de: {
    ...de,
    chat: chatDe,
    image: imageDe,
    video: videoDe,
    providers: providersDe,
    profile: profileDe,
    evaluation: evaluationDe,
    tenants: tenantsDe,
  },
} as const;

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

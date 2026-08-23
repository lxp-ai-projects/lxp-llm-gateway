import { describe, expect, it } from 'vitest';

import i18n, { resources } from './index';
import { supportedLocales } from './locales';

function leafKeys(value: object, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' ? leafKeys(child, path) : [path];
  });
}

function leafValues(value: object): unknown[] {
  return Object.values(value).flatMap((child) =>
    child && typeof child === 'object' ? leafValues(child) : [child],
  );
}

describe('translation completeness', () => {
  const canonicalKeys = leafKeys(resources.en);

  it.each(supportedLocales.filter((locale) => locale !== 'en'))(
    '%s contains every canonical English key',
    (locale) => {
      expect(leafKeys(resources[locale]).sort()).toEqual(
        [...canonicalKeys].sort(),
      );
    },
  );

  it.each(supportedLocales)('%s contains no empty translations', (locale) => {
    expect(
      leafValues(resources[locale]).every(
        (value) => typeof value === 'string' && value.trim(),
      ),
    ).toBe(true);
  });

  it('renders representative domain copy and interpolation in each locale', async () => {
    await i18n.changeLanguage('fr');
    expect(i18n.t('chat:chatComposer.selectedProviderValue', { provider: 'NanoGPT' })).toBe('Fournisseur sélectionné : NanoGPT');
    expect(i18n.t('image:imageHistoryPanel.yes')).toBe('Oui');
    await i18n.changeLanguage('es');
    expect(i18n.t('video:videoResultsPanel.outputValue', { index: 2 })).toBe('Salida 2');
    expect(i18n.t('providers:providerCredentialsPanel.noneConfigured')).toBe('Sin configurar');
    await i18n.changeLanguage('de');
    expect(i18n.t('profile:profilePage.saveProfile')).toBe('Profil speichern');
    expect(i18n.t('evaluation:resultPanel.yes')).toBe('Ja');
    expect(i18n.t('tenants:tenantRegistrationPanel.notConfigured')).toBe('nicht konfiguriert');
    await i18n.changeLanguage('en');
  });
});

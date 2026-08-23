import { describe, expect, it } from 'vitest';

import { localeStorageKey, normalizeLocale, resolveLocale } from './locales';

describe('locale resolution', () => {
  it.each([
    ['fr-CA', 'fr'],
    ['fr-FR', 'fr'],
    ['en-CA', 'en'],
    ['de-DE', 'de'],
    ['es-MX', 'es'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeLocale(input)).toBe(expected);
  });

  it('restores a saved locale before considering the browser', () => {
    expect(
      resolveLocale(
        { getItem: (key) => (key === localeStorageKey ? 'de' : null) },
        ['fr-CA'],
      ),
    ).toBe('de');
  });

  it('uses a supported browser locale for a first-time visitor', () => {
    expect(resolveLocale({ getItem: () => null }, ['pt-BR', 'es-MX'])).toBe(
      'es',
    );
  });

  it('falls back to English for unsupported locales', () => {
    expect(resolveLocale({ getItem: () => null }, ['pt-BR'])).toBe('en');
  });
});

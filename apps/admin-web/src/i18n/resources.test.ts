import { describe, expect, it } from 'vitest';

import { resources } from './index';
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

  it.each(supportedLocales.filter((locale) => locale !== 'en'))('%s contains every canonical English key', (locale) => {
    expect(leafKeys(resources[locale])).toEqual(canonicalKeys);
  });

  it.each(supportedLocales)('%s contains no empty translations', (locale) => {
    expect(leafValues(resources[locale]).every((value) => typeof value === 'string' && value.trim())).toBe(true);
  });
});

import { afterEach, describe, expect, it } from 'vitest';

import i18n from './index';
import { getLocalizedErrorMessage } from './errors';

describe('localized error classification', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('classifies recognized TypeError network messages as network failures', () => {
    expect(getLocalizedErrorMessage(new TypeError('Failed to fetch'))).toBe(
      'The service is unavailable. Check your connection and try again.',
    );
  });

  it('uses the fallback for unrelated TypeError failures', () => {
    expect(
      getLocalizedErrorMessage(
        new TypeError("Cannot read properties of undefined (reading 'id')"),
      ),
    ).toBe('Something went wrong. Please try again.');
  });
});

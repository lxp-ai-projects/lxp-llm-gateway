import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import i18n from '../i18n';
import { localeStorageKey } from '../i18n/locales';
import { renderWithProviders } from '../test/test-utils';
import { LanguageSelector } from './language-selector';

describe('LanguageSelector', () => {
  afterEach(async () => {
    localStorage.clear();
    await act(() => i18n.changeLanguage('en'));
  });

  it('shows all languages and switches without reloading', async () => {
    renderWithProviders(<LanguageSelector />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Select language' }));
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
    expect(screen.getByText('Deutsch')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Français'));
    expect(i18n.resolvedLanguage).toBe('fr');
    expect(localStorage.getItem(localeStorageKey)).toBe('fr');
    expect(document.documentElement.lang).toBe('fr');
    expect(await screen.findByText('Langue')).toBeInTheDocument();
  });

  it('supports the complete language switching cycle', async () => {
    for (const locale of ['fr', 'es', 'de', 'en']) await act(() => i18n.changeLanguage(locale));
    expect(i18n.resolvedLanguage).toBe('en');
    expect(localStorage.getItem(localeStorageKey)).toBe('en');
  });
});

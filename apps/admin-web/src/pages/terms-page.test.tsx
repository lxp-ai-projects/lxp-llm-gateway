import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { TermsPage } from './terms-page';

test('TermsPage renders the legal placeholder copy', () => {
  renderWithProviders(<TermsPage />);

  expect(screen.getByRole('heading', { name: 'Terms of service' })).toBeInTheDocument();
  expect(screen.getByText(/Use of provider credentials remains subject to platform policy/i)).toBeInTheDocument();
  expect(screen.getByText(/Gateway access may be interrupted by a global circuit breaker/i)).toBeInTheDocument();
});

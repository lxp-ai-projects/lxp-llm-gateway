import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { PrivacyPage } from './privacy-page';

test('PrivacyPage renders the security posture summary', () => {
  renderWithProviders(<PrivacyPage />);

  expect(
    screen.getByRole('heading', { name: 'Privacy posture' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Provider API secrets are encrypted at rest/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Browser sessions avoid token exposure to JavaScript/i),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute(
    'href',
    '/login',
  );
});

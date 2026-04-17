import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { AnalyticsPage } from './analytics-page';

test('AnalyticsPage renders the phase 1 analytics placeholders', () => {
  renderWithProviders(<AnalyticsPage />);

  expect(screen.getByRole('heading', { name: 'Gateway Analytics' })).toBeInTheDocument();
  expect(screen.getByText('Active users')).toBeInTheDocument();
  expect(screen.getByText('Distinct gateway users / 24h')).toBeInTheDocument();
  expect(screen.getByText('Gateway requests / 7d')).toBeInTheDocument();
  expect(screen.getByText(/dedicated admin analytics endpoints/i)).toBeInTheDocument();
});

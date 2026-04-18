import { useQueryClient } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { AppProviders } from './providers';

function QueryClientProbe() {
  const queryClient = useQueryClient();

  return <div>{queryClient.getDefaultOptions().queries?.staleTime}</div>;
}

test('AppProviders exposes the configured query client to descendants', () => {
  renderWithProviders(
    <AppProviders>
      <QueryClientProbe />
    </AppProviders>,
  );

  expect(screen.getByText('30000')).toBeInTheDocument();
});

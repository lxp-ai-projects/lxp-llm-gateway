import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { render } from '@testing-library/react';
import type { PropsWithChildren, ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

import { adminWebTheme } from '../app/theme';

function TestProviders({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={adminWebTheme}>
        <MemoryRouter>{children}</MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: ReactElement) {
  return render(ui, {
    wrapper: TestProviders,
  });
}

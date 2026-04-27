import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { adminWebTheme } from '../app/theme';
import { AppShellLayout } from './app-shell-layout';

const {
  getGatewayHealthMock,
  logoutMock,
  invalidateQueriesMock,
  navigateMock,
  useRuntimeConfigMock,
  useSessionMock,
} = vi.hoisted(() => ({
  getGatewayHealthMock: vi.fn(),
  logoutMock: vi.fn(async () => undefined),
  invalidateQueriesMock: vi.fn(async () => undefined),
  navigateMock: vi.fn(),
  useRuntimeConfigMock: vi.fn(),
  useSessionMock: vi.fn(),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    logout: logoutMock,
  },
  gatewayApiClient: {
    getHealth: getGatewayHealthMock,
  },
}));

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: useRuntimeConfigMock,
}));

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>(
    '@tanstack/react-query',
  );
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: invalidateQueriesMock,
    }),
  };
});

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderShell(initialEntry = '/app/admin/users') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={adminWebTheme}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/app/*" element={<AppShellLayout />}>
              <Route path="*" element={<div>workspace content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  logoutMock.mockClear();
  getGatewayHealthMock.mockReset();
  invalidateQueriesMock.mockClear();
  navigateMock.mockClear();
  useRuntimeConfigMock.mockReset();
  useSessionMock.mockReset();

  useRuntimeConfigMock.mockReturnValue({
    data: {
      gatewayOnline: false,
    },
  });
  getGatewayHealthMock.mockResolvedValue({ status: 'down' });
});

test('AppShellLayout shows admin navigation and offline gateway state', async () => {
  useSessionMock.mockReturnValue({
    data: {
      displayName: 'Patrick',
      email: 'patrick@example.com',
      roles: ['admin'],
    },
  });

  renderShell();

  expect(screen.getByText('Patrick')).toBeInTheDocument();
  expect(screen.getByText('patrick@example.com')).toBeInTheDocument();
  expect(await screen.findByText('Gateway offline')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /users/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /health/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /image lab/i })).toBeInTheDocument();
});

test('AppShellLayout shows online gateway state from the real gateway health check', async () => {
  useSessionMock.mockReturnValue({
    data: {
      displayName: 'Patrick',
      email: 'patrick@example.com',
      roles: ['admin'],
    },
  });
  getGatewayHealthMock.mockResolvedValue({ status: 'ok' });

  renderShell();

  expect(await screen.findByText('Gateway online')).toBeInTheDocument();
});

test('AppShellLayout hides admin-only links for regular users and logs out', async () => {
  const user = userEvent.setup();
  useSessionMock.mockReturnValue({
    data: {
      displayName: 'Emilie',
      email: 'emilie@example.com',
      roles: ['user'],
    },
  });

  renderShell('/app/chat');

  expect(
    screen.queryByRole('link', { name: /users/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /analytics/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /health/i }),
  ).not.toBeInTheDocument();

  const [logoutButton] = screen.getAllByRole('button', { name: /logout/i });
  await user.click(logoutButton);

  await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
  await waitFor(() =>
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: ['session'],
    }),
  );
  await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login'));
});

test('AppShellLayout scrolls to the top when the route changes', async () => {
  const user = userEvent.setup();
  useSessionMock.mockReturnValue({
    data: {
      displayName: 'Patrick',
      email: 'patrick@example.com',
      roles: ['admin'],
    },
  });

  const scrollToMock = vi.fn();
  const originalScrollTo = window.scrollTo;
  window.scrollTo = scrollToMock as never;

  try {
    renderShell('/app/profile');
    expect(scrollToMock).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'auto',
    });

    scrollToMock.mockClear();
    await user.click(screen.getByRole('link', { name: /chat lab/i }));
    await waitFor(() =>
      expect(scrollToMock).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: 'auto',
      }),
    );
  } finally {
    window.scrollTo = originalScrollTo;
  }
});

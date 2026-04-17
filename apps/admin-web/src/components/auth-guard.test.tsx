import { screen } from '@testing-library/react';
import { test, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';

import { AuthGuard } from './auth-guard';
import { adminWebTheme } from '../app/theme';

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

beforeEach(() => {
  useSessionMock.mockReset();
});

function renderAuthGuard(ui: React.ReactNode, initialEntries: string[]) {
  return require('@testing-library/react').render(
    <MantineProvider theme={adminWebTheme}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </MantineProvider>,
  );
}

test('AuthGuard shows a loader while the session is restoring', () => {
  useSessionMock.mockReturnValue({
    isPending: true,
    data: null,
  });

  renderAuthGuard(
    <Routes>
      <Route
        path="/app"
        element={
          <AuthGuard>
            <div>protected</div>
          </AuthGuard>
        }
      />
    </Routes>,
    ['/app'],
  );

  expect(screen.getByText('Restoring secure session...')).toBeInTheDocument();
});

test('AuthGuard redirects unauthenticated users to login', () => {
  useSessionMock.mockReturnValue({
    isPending: false,
    data: null,
  });

  renderAuthGuard(
    <Routes>
      <Route
        path="/app/chat"
        element={
          <AuthGuard>
            <div>protected</div>
          </AuthGuard>
        }
      />
      <Route path="/login" element={<div>login page</div>} />
    </Routes>,
    ['/app/chat'],
  );

  expect(screen.getByText('login page')).toBeInTheDocument();
});

test('AuthGuard renders children for authenticated users', () => {
  useSessionMock.mockReturnValue({
    isPending: false,
    data: { userUuid: 'user-1' },
  });

  renderAuthGuard(
    <Routes>
      <Route
        path="/app"
        element={
          <AuthGuard>
            <div>protected</div>
          </AuthGuard>
        }
      />
    </Routes>,
    ['/app'],
  );

  expect(screen.getByText('protected')).toBeInTheDocument();
});

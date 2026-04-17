import { screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ProfilePage } from './profile-page';

const { useSessionMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
}));

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

beforeEach(() => {
  useSessionMock.mockReset();
});

test('ProfilePage renders the current session details when available', () => {
  useSessionMock.mockReturnValue({
    data: {
      displayName: 'Patrick',
      email: 'patrick@example.com',
    },
  });

  renderWithProviders(<ProfilePage />);

  expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  expect(screen.getByText('Display name')).toBeInTheDocument();
  expect(screen.getByText('Patrick')).toBeInTheDocument();
  expect(screen.getByText('patrick@example.com')).toBeInTheDocument();
});

test('ProfilePage falls back to unavailable placeholders without a session payload', () => {
  useSessionMock.mockReturnValue({
    data: null,
  });

  renderWithProviders(<ProfilePage />);

  expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  expect(screen.getByText(/Profile editing, password change, and per-user analytics/i)).toBeInTheDocument();
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ProfilePage } from './profile-page';

const { useSessionMock, updateProfileMock } = vi.hoisted(() => ({
  useSessionMock: vi.fn(),
  updateProfileMock: vi.fn(),
}));

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    updateProfile: updateProfileMock,
  },
}));

beforeEach(() => {
  useSessionMock.mockReset();
  updateProfileMock.mockReset();
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
  expect(screen.getByTestId('profile-display-name-input')).toBeInTheDocument();
  expect(screen.getByText('Patrick')).toBeInTheDocument();
  expect(screen.getByText('patrick@example.com')).toBeInTheDocument();
  expect(screen.getByText('Providers')).toBeInTheDocument();
  expect(screen.getByText('Profile details')).toBeInTheDocument();
  expect(screen.getByDisplayValue('Patrick')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /Open provider settings/i }),
  ).toHaveAttribute('href', '/app/providers');
});

test('ProfilePage falls back to unavailable placeholders without a session payload', () => {
  useSessionMock.mockReturnValue({
    data: null,
    isLoading: false,
  });

  renderWithProviders(<ProfilePage />);

  expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  expect(
    screen.getByText(/Provider tokens and endpoint configuration live on the dedicated/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      /Password change and per-user analytics cards can be added here/i,
    ),
  ).toBeInTheDocument();
});

test('ProfilePage saves the connected user display name', async () => {
  useSessionMock.mockReturnValue({
    data: {
      displayName: 'Patrick',
      email: 'patrick@example.com',
    },
    isLoading: false,
  });
  updateProfileMock.mockResolvedValue({
    displayName: 'Patrice',
    email: 'patrick@example.com',
  });

  renderWithProviders(<ProfilePage />);

  fireEvent.change(screen.getByTestId('profile-display-name-input'), {
    target: { value: 'Patrice' },
  });
  fireEvent.click(screen.getByTestId('profile-save-button'));

  await waitFor(() =>
    expect(updateProfileMock).toHaveBeenCalledWith({ displayName: 'Patrice' }),
  );
  expect(screen.getByText('Your profile has been updated.')).toBeInTheDocument();
});

import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ProfilePage } from './profile-page';

const { useSessionMock, updateProfileMock, changeOwnPasswordMock } = vi.hoisted(
  () => ({
    useSessionMock: vi.fn(),
    updateProfileMock: vi.fn(),
    changeOwnPasswordMock: vi.fn(),
  }),
);

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    updateProfile: updateProfileMock,
    changeOwnPassword: changeOwnPasswordMock,
  },
}));

beforeEach(() => {
  useSessionMock.mockReset();
  updateProfileMock.mockReset();
  changeOwnPasswordMock.mockReset();
});

function mockSession() {
  useSessionMock.mockReturnValue({
    data: {
      displayName: 'Patrick',
      email: 'patrick@example.com',
    },
    isLoading: false,
  });
}

test('ProfilePage renders the current session details and password fields', () => {
  mockSession();

  renderWithProviders(<ProfilePage />);

  expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  expect(screen.getByTestId('profile-display-name-input')).toBeInTheDocument();
  expect(screen.getByText('Patrick')).toBeInTheDocument();
  expect(screen.getByText('patrick@example.com')).toBeInTheDocument();
  expect(screen.getByText('Security')).toBeInTheDocument();
  expect(screen.getByTestId('profile-current-password-input')).toBeInTheDocument();
  expect(screen.getByTestId('profile-new-password-input')).toBeInTheDocument();
  expect(
    screen.getByTestId('profile-confirm-new-password-input'),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /Open provider settings/i }),
  ).toHaveAttribute('href', '/app/providers');
});

test('ProfilePage confirmation mismatch prevents API call and shows validation feedback', async () => {
  mockSession();

  renderWithProviders(<ProfilePage />);

  fireEvent.change(screen.getByTestId('profile-current-password-input'), {
    target: { value: 'Sup3rS3cret!' },
  });
  fireEvent.change(screen.getByTestId('profile-new-password-input'), {
    target: { value: 'EvenB3tterPass!' },
  });
  fireEvent.change(screen.getByTestId('profile-confirm-new-password-input'), {
    target: { value: 'MismatchPass!' },
  });
  fireEvent.click(screen.getByTestId('profile-change-password-button'));

  expect(changeOwnPasswordMock).not.toHaveBeenCalled();
  expect(
    await screen.findByText('New password confirmation does not match.'),
  ).toBeInTheDocument();
});

test('ProfilePage successfully changes the password and clears the fields', async () => {
  mockSession();
  const expectedPayload = {
    currentPassword: 'Sup3rS3cret!',
    newPassword: 'EvenB3tterPass!',
    confirmNewPassword: 'EvenB3tterPass!',
  };
  changeOwnPasswordMock.mockResolvedValue({
    message: 'Password changed successfully.',
  });

  renderWithProviders(<ProfilePage />);

  fireEvent.change(screen.getByTestId('profile-current-password-input'), {
    target: { value: 'Sup3rS3cret!' },
  });
  fireEvent.change(screen.getByTestId('profile-new-password-input'), {
    target: { value: 'EvenB3tterPass!' },
  });
  fireEvent.change(screen.getByTestId('profile-confirm-new-password-input'), {
    target: { value: 'EvenB3tterPass!' },
  });
  fireEvent.click(screen.getByTestId('profile-change-password-button'));

  expect(
    await screen.findByText('Password changed successfully.'),
  ).toBeInTheDocument();
  expect(changeOwnPasswordMock).toHaveBeenCalledWith(expectedPayload);
  expect(screen.getByTestId('profile-current-password-input')).toHaveValue('');
  expect(screen.getByTestId('profile-new-password-input')).toHaveValue('');
  expect(screen.getByTestId('profile-confirm-new-password-input')).toHaveValue(
    '',
  );
});

test('ProfilePage keeps password values when the password change fails', async () => {
  mockSession();
  changeOwnPasswordMock.mockRejectedValue(
    new Error('Current password is invalid.'),
  );

  renderWithProviders(<ProfilePage />);

  fireEvent.change(screen.getByTestId('profile-current-password-input'), {
    target: { value: 'wrong-password' },
  });
  fireEvent.change(screen.getByTestId('profile-new-password-input'), {
    target: { value: 'EvenB3tterPass!' },
  });
  fireEvent.change(screen.getByTestId('profile-confirm-new-password-input'), {
    target: { value: 'EvenB3tterPass!' },
  });
  fireEvent.click(screen.getByTestId('profile-change-password-button'));

  expect(
    await screen.findByText('Something went wrong. Please try again.'),
  ).toBeInTheDocument();
  expect(screen.getByTestId('profile-current-password-input')).toHaveValue(
    'wrong-password',
  );
  expect(screen.getByTestId('profile-new-password-input')).toHaveValue(
    'EvenB3tterPass!',
  );
  expect(screen.getByTestId('profile-confirm-new-password-input')).toHaveValue(
    'EvenB3tterPass!',
  );
});

test('ProfilePage still saves the connected user display name', async () => {
  mockSession();
  const expectedPayload = { displayName: 'Patrice' };
  updateProfileMock.mockResolvedValue({
    displayName: 'Patrice',
    email: 'patrick@example.com',
  });

  renderWithProviders(<ProfilePage />);

  fireEvent.change(screen.getByTestId('profile-display-name-input'), {
    target: { value: 'Patrice' },
  });
  fireEvent.click(screen.getByTestId('profile-save-button'));

  expect(
    await screen.findByText('Your profile has been updated.'),
  ).toBeInTheDocument();
  expect(updateProfileMock).toHaveBeenCalledWith(expectedPayload);
});

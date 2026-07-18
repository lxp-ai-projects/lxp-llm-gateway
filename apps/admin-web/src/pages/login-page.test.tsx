import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { LoginPage } from './login-page';

const { locationState, loginMock, navigateMock, sessionTimeoutStorageKey } =
  vi.hoisted(() => ({
    locationState: { current: null as { from?: string } | null },
    loginMock: vi.fn(async () => undefined),
    navigateMock: vi.fn(),
    sessionTimeoutStorageKey: 'lxp.session-timeout-message',
  }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useLocation: () => ({ state: locationState.current }),
    useNavigate: () => navigateMock,
  };
});

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: () => ({
    data: {
      registrationEnabled: true,
      forgotPasswordEnabled: false,
      gatewayOnline: true,
      supportedProviders: [],
    },
  }),
}));

vi.mock('../lib/api-client', () => ({
  SESSION_TIMEOUT_MESSAGE_STORAGE_KEY: sessionTimeoutStorageKey,
  adminApiClient: {
    login: loginMock,
  },
}));

beforeEach(() => {
  locationState.current = null;
  loginMock.mockClear();
  navigateMock.mockClear();
});

test('LoginPage reflects runtime config and enables sign-in once prerequisites are met', async () => {
  const user = userEvent.setup();

  renderWithProviders(<LoginPage />);

  expect(screen.getByText('Create account')).toBeInTheDocument();
  expect(screen.getByText('Recovery disabled')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('email@domain.com')).toBeInTheDocument();
  expect(screen.queryByText('Phase 1 experience')).not.toBeInTheDocument();

  const signInButton = screen.getByRole('button', { name: 'Sign in' });
  expect(signInButton).toBeDisabled();

  await user.type(screen.getByLabelText('Email'), 'patrick@example.com');
  await user.type(screen.getByLabelText('Password'), 'Sup3rS3cret!');
  await user.click(screen.getByRole('checkbox'));

  expect(signInButton).toBeEnabled();
}, 10_000);

test('LoginPage keeps the cookie-based login flow and redirects after success', async () => {
  const user = userEvent.setup();

  renderWithProviders(<LoginPage />);

  await user.type(screen.getByLabelText('Email'), 'patrick@example.com');
  await user.type(screen.getByLabelText('Password'), 'Sup3rS3cret!');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByTestId('auth-login-submit'));

  await waitFor(() =>
    expect(loginMock).toHaveBeenCalledWith({
      email: 'patrick@example.com',
      password: 'Sup3rS3cret!',
    }),
  );
  await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/app'));
});

test('LoginPage returns to the original route after success', async () => {
  const user = userEvent.setup();
  locationState.current = { from: '/app/providers' };

  renderWithProviders(<LoginPage />);

  await user.type(screen.getByLabelText('Email'), 'patrick@example.com');
  await user.type(screen.getByLabelText('Password'), 'Sup3rS3cret!');
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByTestId('auth-login-submit'));

  await waitFor(() =>
    expect(navigateMock).toHaveBeenCalledWith('/app/providers'),
  );
});

test('LoginPage renders a non-interactive decorative wave background', () => {
  renderWithProviders(<LoginPage />);

  expect(screen.getByTestId('auth-wave-background')).toHaveAttribute(
    'aria-hidden',
    'true',
  );
  expect(screen.getByTestId('auth-wave-background')).toHaveClass(
    'auth-wave-background',
  );
});

test('LoginPage displays and clears the session timeout message', async () => {
  window.sessionStorage.setItem(
    sessionTimeoutStorageKey,
    'Session is timed out, you have to login again.',
  );

  renderWithProviders(<LoginPage />);

  expect(
    await screen.findByText('Session is timed out, you have to login again.'),
  ).toBeInTheDocument();
  expect(window.sessionStorage.getItem(sessionTimeoutStorageKey)).toBeNull();
});

test('LoginPage clears the session timeout message when the user edits the form', async () => {
  const user = userEvent.setup();

  window.sessionStorage.setItem(
    sessionTimeoutStorageKey,
    'Session is timed out, you have to login again.',
  );

  renderWithProviders(<LoginPage />);

  expect(
    await screen.findByText('Session is timed out, you have to login again.'),
  ).toBeInTheDocument();

  await user.type(screen.getByLabelText('Email'), 'email@domain.com');

  expect(
    screen.queryByText('Session is timed out, you have to login again.'),
  ).not.toBeInTheDocument();
});

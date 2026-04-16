import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { LoginPage } from './login-page';

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
  adminApiClient: {
    login: vi.fn(async () => undefined),
  },
}));

test('LoginPage reflects runtime config and enables sign-in once prerequisites are met', async () => {
  const user = userEvent.setup();

  renderWithProviders(<LoginPage />);

  expect(screen.getByText('Create account')).toBeInTheDocument();
  expect(screen.getByText('Recovery disabled')).toBeInTheDocument();

  const signInButton = screen.getByRole('button', { name: 'Sign in' });
  expect(signInButton).toBeDisabled();

  await user.type(screen.getByLabelText('Email'), 'patrick@example.com');
  await user.type(screen.getByLabelText('Password'), 'Sup3rS3cret!');
  await user.click(screen.getByRole('checkbox'));

  expect(signInButton).toBeEnabled();
});

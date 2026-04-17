import { screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { ForgotPasswordPage } from './forgot-password-page';

const { useRuntimeConfigMock } = vi.hoisted(() => ({
  useRuntimeConfigMock: vi.fn(),
}));

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: useRuntimeConfigMock,
}));

beforeEach(() => {
  useRuntimeConfigMock.mockReset();
});

test('ForgotPasswordPage reflects the enabled runtime-config state', () => {
  useRuntimeConfigMock.mockReturnValue({
    data: {
      forgotPasswordEnabled: true,
    },
  });

  renderWithProviders(<ForgotPasswordPage />);

  expect(screen.getByRole('heading', { name: 'Forgot password' })).toBeInTheDocument();
  expect(screen.getByText(/password recovery backend flow has not been implemented yet/i)).toBeInTheDocument();
});

test('ForgotPasswordPage reflects the disabled runtime-config state', () => {
  useRuntimeConfigMock.mockReturnValue({
    data: {
      forgotPasswordEnabled: false,
    },
  });

  renderWithProviders(<ForgotPasswordPage />);

  expect(screen.getByText('Disabled by configuration')).toBeInTheDocument();
  expect(screen.getByText(/Forgot-password is currently disabled/i)).toBeInTheDocument();
});

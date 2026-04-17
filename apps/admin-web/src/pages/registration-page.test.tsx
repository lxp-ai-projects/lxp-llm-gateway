import { screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { RegistrationPage } from './registration-page';

const { useRuntimeConfigMock } = vi.hoisted(() => ({
  useRuntimeConfigMock: vi.fn(),
}));

vi.mock('../lib/use-runtime-config', () => ({
  useRuntimeConfig: useRuntimeConfigMock,
}));

beforeEach(() => {
  useRuntimeConfigMock.mockReset();
});

test('RegistrationPage shows the enabled state', () => {
  useRuntimeConfigMock.mockReturnValue({
    data: {
      registrationEnabled: true,
    },
  });

  renderWithProviders(<RegistrationPage />);

  expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  expect(screen.getByText(/Self-registration is enabled by runtime config/i)).toBeInTheDocument();
});

test('RegistrationPage shows the disabled state', () => {
  useRuntimeConfigMock.mockReturnValue({
    data: {
      registrationEnabled: false,
    },
  });

  renderWithProviders(<RegistrationPage />);

  expect(screen.getByText('Disabled by configuration')).toBeInTheDocument();
  expect(screen.getByText(/Registration is currently disabled/i)).toBeInTheDocument();
});

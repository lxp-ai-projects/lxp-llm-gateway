import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { UsersPage } from './users-page';

const {
  createUserMock,
  getUserProviderCredentialsMock,
  getUsersMock,
  updateUserMock,
} = vi.hoisted(() => ({
  createUserMock: vi.fn(async () => ({
    userUuid: 'user-2',
    displayName: 'Emilie Joli',
    email: 'emilie@example.com',
    status: 'active' as const,
    roles: ['user'],
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
  })),
  getUserProviderCredentialsMock: vi.fn(async () => []),
  getUsersMock: vi.fn(async () => [
    {
      userUuid: 'user-1',
      displayName: 'Patrick',
      email: 'patrick@example.com',
      status: 'active' as const,
      roles: ['admin'],
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    },
  ]),
  updateUserMock: vi.fn(async () => ({
    userUuid: 'user-1',
    displayName: 'Patrick',
    email: 'patrick@example.com',
    status: 'disabled' as const,
    roles: ['admin'],
    createdAt: '2026-04-17T00:00:00.000Z',
    updatedAt: '2026-04-17T00:00:00.000Z',
  })),
}));

vi.mock('../lib/api-client', () => ({
  adminApiClient: {
    createUser: createUserMock,
    getUserProviderCredentials: getUserProviderCredentialsMock,
    getUsers: getUsersMock,
    updateUser: updateUserMock,
  },
}));

beforeEach(() => {
  createUserMock.mockClear();
  getUserProviderCredentialsMock.mockClear();
  getUsersMock.mockClear();
  updateUserMock.mockClear();
});

test('UsersPage creates a new user from the modal', async () => {
  const user = userEvent.setup();

  renderWithProviders(<UsersPage />);

  await user.click(await screen.findByRole('button', { name: 'Create user' }));

  expect(await screen.findByRole('heading', { name: 'Create user' })).toBeInTheDocument();
  const dialog = screen.getByRole('dialog');

  await user.type(within(dialog).getByLabelText('Display name'), 'Emilie Joli');
  await user.type(within(dialog).getByLabelText('Email'), 'emilie@example.com');
  await user.type(within(dialog).getByLabelText('Temporary password'), 'temporary-pass');
  await user.click(within(dialog).getByRole('button', { name: /^create user$/i }));

  await waitFor(() =>
    expect(createUserMock).toHaveBeenCalledWith({
      displayName: 'Emilie Joli',
      email: 'emilie@example.com',
      password: 'temporary-pass',
      roles: ['user'],
    }),
  );
}, 10000);

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { UsersPage } from './users-page';

const {
  createUserMock,
  getUserProviderCredentialsMock,
  getUsersMock,
  useSessionMock,
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
  useSessionMock: vi.fn(),
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

vi.mock('../lib/use-session', () => ({
  useSession: useSessionMock,
}));

beforeEach(() => {
  createUserMock.mockClear();
  getUserProviderCredentialsMock.mockClear();
  getUsersMock.mockClear();
  useSessionMock.mockReset();
  updateUserMock.mockClear();
  useSessionMock.mockReturnValue({
    data: {
      activeTenantId: 'tenant-1',
      activeTenantSlug: 'tenant-one',
      availableTenants: [
        {
          id: 'tenant-1',
          slug: 'tenant-one',
          displayName: 'Tenant One',
          roles: ['tenant_admin'],
          isDirectMember: true,
        },
      ],
    },
  });
});

test('UsersPage creates a new user from the modal', async () => {
  renderWithProviders(<UsersPage />);

  expect(
    screen.getByText('Active tenant: Tenant One (tenant-one)'),
  ).toBeInTheDocument();
  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'Create user' }))[0]!,
  );

  expect(
    await screen.findByRole('heading', { name: 'Create user' }),
  ).toBeInTheDocument();
  const dialog = await screen.findByRole('dialog');

  fireEvent.change(within(dialog).getByTestId('users-create-display-name'), {
    target: { value: 'Emilie Joli' },
  });
  fireEvent.change(within(dialog).getByTestId('users-create-email'), {
    target: { value: 'emilie@example.com' },
  });
  fireEvent.change(within(dialog).getByTestId('users-create-password'), {
    target: { value: 'temporary-pass' },
  });
  fireEvent.click(
    within(dialog).getByRole('button', { name: /^create user$/i }),
  );

  await waitFor(() =>
    expect(createUserMock).toHaveBeenCalledWith({
      displayName: 'Emilie Joli',
      email: 'emilie@example.com',
      password: 'temporary-pass',
      roles: ['user'],
    }),
  );
}, 15_000);

test('UsersPage filters the directory and opens provider credentials for a selected user', async () => {
  getUsersMock.mockResolvedValueOnce([
    {
      userUuid: 'user-1',
      displayName: 'Patrick',
      email: 'patrick@example.com',
      status: 'active' as const,
      roles: ['admin'],
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    },
    {
      userUuid: 'user-2',
      displayName: 'Emilie Joli',
      email: 'emilie@example.com',
      status: 'disabled' as const,
      roles: ['user'],
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    },
  ]);
  getUserProviderCredentialsMock.mockResolvedValueOnce([
    {
      id: 'credential-1',
      userUuid: 'user-2',
      providerId: 'nanogpt',
      providerDisplayName: 'NanoGPT',
      label: 'primary',
      maskedHint: '****1234',
    },
  ]);

  renderWithProviders(<UsersPage />);

  fireEvent.change(await screen.findByPlaceholderText('Search users...'), {
    target: { value: 'emilie' },
  });

  await waitFor(() =>
    expect(screen.getAllByText('Emilie Joli').length).toBeGreaterThan(0),
  );
  expect(screen.queryByText('patrick@example.com')).not.toBeInTheDocument();

  fireEvent.click(
    screen.getAllByRole('button', { name: 'View credentials' })[0]!,
  );

  expect(
    await screen.findByRole('heading', {
      name: /Provider credentials: Emilie Joli/i,
    }),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(getUserProviderCredentialsMock).toHaveBeenCalledWith('user-2'),
  );
  expect(screen.getAllByText('NanoGPT').length).toBeGreaterThan(0);
  expect(screen.getAllByText('****1234').length).toBeGreaterThan(0);
}, 15_000);

test('UsersPage keeps create user disabled until minimum credentials are valid and cancel resets the form', async () => {
  renderWithProviders(<UsersPage />);

  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'Create user' }))[0]!,
  );

  const dialog = await screen.findByRole('dialog');
  const createButton = within(dialog).getByRole('button', {
    name: /^create user$/i,
  });

  expect(createButton).toBeDisabled();

  fireEvent.change(within(dialog).getByTestId('users-create-display-name'), {
    target: { value: 'Emilie Joli' },
  });
  fireEvent.change(within(dialog).getByTestId('users-create-email'), {
    target: { value: 'emilie@example.com' },
  });
  fireEvent.change(within(dialog).getByTestId('users-create-password'), {
    target: { value: 'short' },
  });

  expect(createButton).toBeDisabled();

  fireEvent.change(within(dialog).getByTestId('users-create-password'), {
    target: { value: 'temporary-pass' },
  });

  expect(createButton).toBeEnabled();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'Create user' }))[0]!,
  );

  const reopenedDialog = await screen.findByRole('dialog');
  expect(within(reopenedDialog).getByTestId('users-create-display-name')).toHaveValue('');
  expect(within(reopenedDialog).getByTestId('users-create-email')).toHaveValue('');
  expect(
    within(reopenedDialog).getByTestId('users-create-password'),
  ).toHaveValue('');
}, 15_000);

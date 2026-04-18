import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { PropsWithChildren } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';

import { adminWebTheme } from '../../../app/theme';
import { useUsersController } from './use-users-controller';

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

vi.mock('../../../lib/api-client', () => ({
  adminApiClient: {
    createUser: createUserMock,
    getUserProviderCredentials: getUserProviderCredentialsMock,
    getUsers: getUsersMock,
    updateUser: updateUserMock,
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={adminWebTheme}>
          <MemoryRouter>{children}</MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  createUserMock.mockClear();
  getUserProviderCredentialsMock.mockClear();
  getUsersMock.mockClear();
  updateUserMock.mockClear();
  getUsersMock.mockResolvedValue([
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
  getUserProviderCredentialsMock.mockResolvedValue([
    {
      id: 'credential-1',
      userUuid: 'user-2',
      providerId: 'nanogpt',
      providerDisplayName: 'NanoGPT',
      label: 'primary',
      maskedHint: '****1234',
    },
  ]);
});

test('useUsersController filters users and loads credentials for the selected user', async () => {
  const wrapper = createWrapper();
  const { result } = renderHook(() => useUsersController(), { wrapper });

  await waitFor(() => expect(result.current.filteredUsers).toHaveLength(2));

  act(() => {
    result.current.onSearchChange('emilie');
  });

  expect(result.current.filteredUsers).toHaveLength(1);
  expect(result.current.filteredUsers[0]?.displayName).toBe('Emilie Joli');

  act(() => {
    result.current.onOpenCredentials(result.current.filteredUsers[0]!);
  });

  expect(result.current.credentialsOpened).toBe(true);
  await waitFor(() => expect(getUserProviderCredentialsMock).toHaveBeenCalledWith('user-2'));
  await waitFor(() => expect(result.current.credentials).toHaveLength(1));
});

test('useUsersController validates create user input and resets state after success', async () => {
  const wrapper = createWrapper();
  const { result } = renderHook(() => useUsersController(), { wrapper });

  await waitFor(() => expect(result.current.filteredUsers).toHaveLength(2));

  act(() => {
    result.current.onOpenCreateUser();
    result.current.onCreateDisplayNameChange('Emilie Joli');
    result.current.onCreateEmailChange('emilie@example.com');
    result.current.onCreatePasswordChange('short');
  });

  await act(async () => {
    result.current.handleCreateUserSubmit({
      preventDefault() {},
    } as never);
  });

  expect(createUserMock).not.toHaveBeenCalled();

  act(() => {
    result.current.onCreatePasswordChange('temporary-pass');
    result.current.onCreateRolesChange(['admin', 'user']);
  });

  await act(async () => {
    result.current.handleCreateUserSubmit({
      preventDefault() {},
    } as never);
  });

  await waitFor(() =>
    expect(createUserMock).toHaveBeenCalledWith({
      displayName: 'Emilie Joli',
      email: 'emilie@example.com',
      password: 'temporary-pass',
      roles: ['admin', 'user'],
    }),
  );

  expect(result.current.createUserOpened).toBe(false);
  expect(result.current.createDisplayName).toBe('');
  expect(result.current.createEmail).toBe('');
  expect(result.current.createPassword).toBe('');
  expect(result.current.createRoles).toEqual(['user']);
});

test('useUsersController updates user status and resets the create form on close', async () => {
  const wrapper = createWrapper();
  const { result } = renderHook(() => useUsersController(), { wrapper });

  await waitFor(() => expect(result.current.filteredUsers).toHaveLength(2));

  act(() => {
    result.current.onStatusChange('user-1', 'disabled');
  });

  await waitFor(() =>
    expect(updateUserMock).toHaveBeenCalledWith('user-1', { status: 'disabled' }),
  );

  act(() => {
    result.current.onOpenCreateUser();
    result.current.onCreateDisplayNameChange('Temp');
    result.current.onCreateEmailChange('temp@example.com');
    result.current.onCreatePasswordChange('temporary-pass');
    result.current.onCloseCreateUser();
  });

  expect(result.current.createUserOpened).toBe(false);
  expect(result.current.createDisplayName).toBe('');
  expect(result.current.createEmail).toBe('');
  expect(result.current.createPassword).toBe('');
  expect(result.current.createRoles).toEqual(['user']);
});

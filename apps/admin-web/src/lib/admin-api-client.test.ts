import { beforeEach, expect, test, vi } from 'vitest';

const {
  requestBlobWithSessionRefreshMock,
  requestMock,
  uploadFileWithSessionRefreshMock,
} = vi.hoisted(() => ({
  requestBlobWithSessionRefreshMock: vi.fn(),
  requestMock: vi.fn(),
  uploadFileWithSessionRefreshMock: vi.fn(),
}));

vi.mock('./api-base', () => ({
  adminApiUrl: 'http://localhost:3002',
  refreshBrowserSession: vi.fn(),
  request: requestMock,
  requestBlobWithSessionRefresh: requestBlobWithSessionRefreshMock,
  uploadFileWithSessionRefresh: uploadFileWithSessionRefreshMock,
}));

import { adminApiClient } from './admin-api-client';

beforeEach(() => {
  requestMock.mockReset();
  requestBlobWithSessionRefreshMock.mockReset();
  uploadFileWithSessionRefreshMock.mockReset();
});

test('adminApiClient delegates CRUD endpoints to request with the expected payloads', async () => {
  requestMock.mockResolvedValue({});

  await adminApiClient.logout();
  await adminApiClient.getHealth();
  await adminApiClient.getUsers();
  await adminApiClient.createUser({
    email: 'emilie@example.com',
    password: 'temporary-pass',
    displayName: 'Emilie Joli',
    roles: ['user'],
  });
  await adminApiClient.updateUser('user-1', {
    displayName: 'Emilie',
    status: 'disabled',
    roles: ['admin'],
  });
  await adminApiClient.getOwnProviderCredentials();
  await adminApiClient.updateOwnProviderCredential('credential-1', {
    label: 'main',
    apiToken: 'rotated-token',
  });
  await adminApiClient.createOwnProviderCredential({
    providerId: 'nanogpt',
    label: 'primary',
    apiToken: 'fresh-token',
  });
  await adminApiClient.getOwnProviderSettings();
  await adminApiClient.updateOwnProviderSettings({
    defaultProviderId: 'nanogpt',
    defaultModel: 'z-ai/glm-4.6:thinking',
  });
  await adminApiClient.getUserProviderCredentials('user-1');

  expect(requestMock).toHaveBeenNthCalledWith(
    1,
    'http://localhost:3002/api/v1/auth/logout',
    { method: 'POST' },
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    2,
    'http://localhost:3002/api/v1/health',
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    3,
    'http://localhost:3002/api/v1/admin/users',
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    4,
    'http://localhost:3002/api/v1/admin/users',
    {
      method: 'POST',
      body: JSON.stringify({
        email: 'emilie@example.com',
        password: 'temporary-pass',
        displayName: 'Emilie Joli',
        roles: ['user'],
      }),
    },
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    5,
    'http://localhost:3002/api/v1/admin/users/user-1',
    {
      method: 'PATCH',
      body: JSON.stringify({
        displayName: 'Emilie',
        status: 'disabled',
        roles: ['admin'],
      }),
    },
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    6,
    'http://localhost:3002/api/v1/provider-credentials',
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    7,
    'http://localhost:3002/api/v1/provider-credentials/credential-1',
    {
      method: 'PATCH',
      body: JSON.stringify({
        label: 'main',
        apiToken: 'rotated-token',
      }),
    },
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    8,
    'http://localhost:3002/api/v1/provider-credentials',
    {
      method: 'POST',
      body: JSON.stringify({
        providerId: 'nanogpt',
        label: 'primary',
        apiToken: 'fresh-token',
      }),
    },
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    9,
    'http://localhost:3002/api/v1/provider-settings',
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    10,
    'http://localhost:3002/api/v1/provider-settings',
    {
      method: 'PATCH',
      body: JSON.stringify({
        defaultProviderId: 'nanogpt',
        defaultModel: 'z-ai/glm-4.6:thinking',
      }),
    },
  );
  expect(requestMock).toHaveBeenNthCalledWith(
    11,
    'http://localhost:3002/api/v1/admin/users/user-1/provider-credentials',
  );
});

test('adminApiClient login posts credentials then resolves the session through getSession', async () => {
  requestMock.mockResolvedValue({});
  const getSessionSpy = vi
    .spyOn(adminApiClient, 'getSession')
    .mockResolvedValue({
      userUuid: 'user-1',
      email: 'patrick@example.com',
      displayName: 'Patrick',
      status: 'active',
      roles: ['admin'],
    });

  await expect(
    adminApiClient.login({ email: 'patrick@example.com', password: 'secret' }),
  ).resolves.toEqual(
    expect.objectContaining({
      userUuid: 'user-1',
      email: 'patrick@example.com',
    }),
  );

  expect(requestMock).toHaveBeenCalledWith(
    'http://localhost:3002/api/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        email: 'patrick@example.com',
        password: 'secret',
      }),
      skipSessionRefresh: true,
    },
  );
  expect(getSessionSpy).toHaveBeenCalledTimes(1);
});

test('adminApiClient transfer helpers delegate to blob and upload helpers', async () => {
  requestBlobWithSessionRefreshMock
    .mockResolvedValueOnce({
      blob: new Blob(['conversation']),
      fileName: 'conversation.json',
    })
    .mockResolvedValueOnce({
      blob: new Blob(['archive']),
      fileName: 'archive.zip',
    });
  uploadFileWithSessionRefreshMock.mockResolvedValue({
    conversations: [{ id: 'conversation-1' }],
  });

  const conversation = {
    id: 'conversation-1',
    title: 'Thread',
    model: 'z-ai/glm-4.6:thinking',
    providerId: 'nanogpt',
    messages: [],
    updatedAt: '2026-04-17T00:00:00.000Z',
  };
  const file = new File(['{}'], 'conversation.json', {
    type: 'application/json',
  });

  await adminApiClient.exportConversation(conversation);
  await adminApiClient.exportConversationArchive([conversation]);
  await adminApiClient.importConversationFile(file);

  expect(requestBlobWithSessionRefreshMock).toHaveBeenNthCalledWith(
    1,
    'http://localhost:3002/api/v1/chat-transfers/export/conversation',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation }),
    },
    false,
  );
  expect(requestBlobWithSessionRefreshMock).toHaveBeenNthCalledWith(
    2,
    'http://localhost:3002/api/v1/chat-transfers/export/archive',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversations: [conversation] }),
    },
    false,
  );
  expect(uploadFileWithSessionRefreshMock).toHaveBeenCalledWith(
    'http://localhost:3002/api/v1/chat-transfers/import',
    file,
    false,
  );
});

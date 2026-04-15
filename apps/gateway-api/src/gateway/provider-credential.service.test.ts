import assert from 'node:assert/strict';
import test from 'node:test';

import { ProviderCredentialService } from './provider-credential.service';

function createRepositoryMock<T>(data: T[]) {
  return {
    async findOne({
      where,
    }: {
      where: Partial<T>;
      order?: Record<string, 'ASC' | 'DESC'>;
    }): Promise<T | null> {
      return (
        data.find((item) =>
          Object.entries(where).every(
            ([key, value]) => item[key as keyof T] === value,
          ),
        ) ?? null
      );
    },
  };
}

test('ProviderCredentialService resolves and decrypts an active provider credential', async () => {
  const userRepository = createRepositoryMock([
    {
      id: 'user-1',
      userUuid: 'user-public-1',
      emailHash: 'hash-1',
      status: 'active',
    },
  ]);
  const providerRepository = createRepositoryMock([
    {
      id: 'provider-1',
      providerId: 'nanogpt',
      status: 'active',
    },
  ]);
  const credentialRepository = createRepositoryMock([
    {
      userId: 'user-1',
      providerId: 'provider-1',
      isActive: true,
      encryptedSecret: 'cipher',
      iv: 'iv',
      authTag: 'tag',
      keyVersion: 1,
    },
  ]);
  const encryptionService = {
    decrypt(): string {
      return 'nano-secret-token';
    },
  };

  const service = new ProviderCredentialService(
    userRepository as never,
    providerRepository as never,
    credentialRepository as never,
    encryptionService as never,
  );

  const apiKey = await service.resolveApiKey('hash-1', 'nanogpt');
  assert.equal(apiKey, 'nano-secret-token');
});

test('ProviderCredentialService throws an explicit error when credential decryption fails', async () => {
  const userRepository = createRepositoryMock([
    {
      id: 'user-1',
      userUuid: 'user-public-1',
      emailHash: 'hash-1',
      status: 'active',
    },
  ]);
  const providerRepository = createRepositoryMock([
    {
      id: 'provider-1',
      providerId: 'nanogpt',
      status: 'active',
    },
  ]);
  const credentialRepository = createRepositoryMock([
    {
      userId: 'user-1',
      providerId: 'provider-1',
      isActive: true,
      encryptedSecret: 'cipher',
      iv: 'iv',
      authTag: 'tag',
      keyVersion: 1,
    },
  ]);
  const encryptionService = {
    decrypt(): string {
      throw new Error('Unsupported state or unable to authenticate data');
    },
  };

  const service = new ProviderCredentialService(
    userRepository as never,
    providerRepository as never,
    credentialRepository as never,
    encryptionService as never,
  );

  await assert.rejects(
    () => service.resolveApiKey('hash-1', 'nanogpt'),
    /Unable to decrypt the stored credential for provider nanogpt/,
  );
});

test('ProviderCredentialService rejects missing authenticated user context', async () => {
  const service = new ProviderCredentialService(
    createRepositoryMock([]) as never,
    createRepositoryMock([]) as never,
    createRepositoryMock([]) as never,
    { decrypt: () => 'unused' } as never,
  );

  await assert.rejects(
    () => service.resolveApiKey('', 'nanogpt'),
    /Missing authenticated user email hash/,
  );
});

test('ProviderCredentialService rejects when the authenticated user cannot be resolved', async () => {
  const service = new ProviderCredentialService(
    createRepositoryMock([]) as never,
    createRepositoryMock([]) as never,
    createRepositoryMock([]) as never,
    { decrypt: () => 'unused' } as never,
  );

  await assert.rejects(
    () => service.resolveApiKey('missing-hash', 'nanogpt'),
    /Unable to resolve the provider credential for the authenticated request/,
  );
});

test('ProviderCredentialService rejects when the provider cannot be resolved', async () => {
  const userRepository = createRepositoryMock([
    {
      id: 'user-1',
      userUuid: 'user-public-1',
      emailHash: 'hash-1',
      status: 'active',
    },
  ]);

  const service = new ProviderCredentialService(
    userRepository as never,
    createRepositoryMock([]) as never,
    createRepositoryMock([]) as never,
    { decrypt: () => 'unused' } as never,
  );

  await assert.rejects(
    () => service.resolveApiKey('hash-1', 'nanogpt'),
    /Unable to resolve the provider credential for the authenticated request/,
  );
});

test('ProviderCredentialService rejects when no active credential exists', async () => {
  const userRepository = createRepositoryMock([
    {
      id: 'user-1',
      userUuid: 'user-public-1',
      emailHash: 'hash-1',
      status: 'active',
    },
  ]);
  const providerRepository = createRepositoryMock([
    {
      id: 'provider-1',
      providerId: 'nanogpt',
      status: 'active',
    },
  ]);

  const service = new ProviderCredentialService(
    userRepository as never,
    providerRepository as never,
    createRepositoryMock([]) as never,
    { decrypt: () => 'unused' } as never,
  );

  await assert.rejects(
    () => service.resolveApiKey('hash-1', 'nanogpt'),
    /Unable to resolve the provider credential for the authenticated request/,
  );
});

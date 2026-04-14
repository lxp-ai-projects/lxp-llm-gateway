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
    providerRepository as never,
    credentialRepository as never,
    encryptionService as never,
  );

  const apiKey = await service.resolveApiKey('user-1', 'nanogpt');
  assert.equal(apiKey, 'nano-secret-token');
});

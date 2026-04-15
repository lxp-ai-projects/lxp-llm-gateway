import assert from 'node:assert/strict';
import test from 'node:test';

import { ProviderEntity } from './provider.entity';
import { UserProviderCredentialEntity } from './user-provider-credential.entity';
import { UserEntity } from './user.entity';

test('gateway persistence entities can be instantiated with expected fields', () => {
  const provider = new ProviderEntity();
  provider.id = 'provider-row-id';
  provider.providerId = 'nanogpt';
  provider.displayName = 'NanoGPT';
  provider.status = 'active';

  const user = new UserEntity();
  user.id = 'user-row-id';
  user.userUuid = 'public-user-uuid';
  user.emailHash = 'email-hash';
  user.status = 'active';

  const credential = new UserProviderCredentialEntity();
  credential.id = 'credential-row-id';
  credential.userId = user.id;
  credential.providerId = provider.id;
  credential.label = 'primary';
  credential.encryptedSecret = 'ciphertext';
  credential.iv = 'base64-iv';
  credential.authTag = 'base64-tag';
  credential.keyVersion = 1;
  credential.isActive = true;
  credential.maskedHint = '***1234';

  assert.equal(provider.providerId, 'nanogpt');
  assert.equal(user.userUuid, 'public-user-uuid');
  assert.equal(credential.providerId, provider.id);
  assert.equal(credential.userId, user.id);
  assert.equal(credential.maskedHint, '***1234');
});

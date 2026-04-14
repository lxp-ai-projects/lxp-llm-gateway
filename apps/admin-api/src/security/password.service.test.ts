import assert from 'node:assert/strict';
import test from 'node:test';

import { PasswordService } from './password.service';

test('PasswordService hashes passwords with Argon2id-compatible output', async () => {
  const service = new PasswordService();
  const passwordHash = await service.hashPassword('Sup3rS3cret!');

  assert.match(passwordHash, /^\$argon2id\$/);
  assert.equal(await service.verifyPassword('Sup3rS3cret!', passwordHash), true);
  assert.equal(await service.verifyPassword('wrong-password', passwordHash), false);
});

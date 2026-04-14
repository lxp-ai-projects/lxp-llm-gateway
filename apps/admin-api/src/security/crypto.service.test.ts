import assert from 'node:assert/strict';
import test from 'node:test';

import { EncryptionService } from './encryption.service';

test('EncryptionService encrypts and decrypts using AES-256-GCM', () => {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';

  const service = new EncryptionService();
  const encrypted = service.encrypt('nano-secret-token');

  assert.notEqual(encrypted.ciphertext, 'nano-secret-token');
  assert.equal(service.decrypt(encrypted), 'nano-secret-token');
});

test('EncryptionService fails when ciphertext integrity is broken', () => {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';

  const service = new EncryptionService();
  const encrypted = service.encrypt('nano-secret-token');

  encrypted.authTag = Buffer.alloc(16, 1).toString('base64');

  assert.throws(() => service.decrypt(encrypted));
});

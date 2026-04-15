import assert from 'node:assert/strict';
import test from 'node:test';

import { EncryptionService } from './encryption.service';

test('EncryptionService requires the master key environment variable', () => {
  delete process.env.LXP_ENCRYPTION_MASTER_KEY;
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';

  assert.throws(
    () => new EncryptionService(),
    /Missing required environment variable: LXP_ENCRYPTION_MASTER_KEY/,
  );
});

test('EncryptionService requires a base64-encoded 32-byte master key', () => {
  process.env.LXP_ENCRYPTION_MASTER_KEY = Buffer.from('short-key').toString('base64');
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';

  assert.throws(
    () => new EncryptionService(),
    /LXP_ENCRYPTION_MASTER_KEY must be a base64-encoded 32-byte key/,
  );
});

test('EncryptionService requires the key version environment variable', () => {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  delete process.env.LXP_ENCRYPTION_KEY_VERSION;

  assert.throws(
    () => new EncryptionService(),
    /Missing required environment variable: LXP_ENCRYPTION_KEY_VERSION/,
  );
});

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

test('EncryptionService fails when the encrypted value uses a different key version', () => {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';

  const service = new EncryptionService();
  const encrypted = service.encrypt('nano-secret-token');

  encrypted.keyVersion = 2;

  assert.throws(
    () => service.decrypt(encrypted),
    /Unsupported encryption key version: 2/,
  );
});

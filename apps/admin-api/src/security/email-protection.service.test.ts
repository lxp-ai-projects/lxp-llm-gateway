import assert from 'node:assert/strict';
import test from 'node:test';

import { EmailProtectionService } from './email-protection.service';
import { EncryptionService } from './encryption.service';

test('EmailProtectionService requires the email lookup key environment variable', () => {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';
  delete process.env.LXP_EMAIL_LOOKUP_KEY;

  assert.throws(
    () => new EmailProtectionService(new EncryptionService()),
    /Missing required environment variable: LXP_EMAIL_LOOKUP_KEY/,
  );
});

test('EmailProtectionService requires a base64-encoded 32-byte lookup key', () => {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';
  process.env.LXP_EMAIL_LOOKUP_KEY = Buffer.from('short-key').toString('base64');

  assert.throws(
    () => new EmailProtectionService(new EncryptionService()),
    /LXP_EMAIL_LOOKUP_KEY must be a base64-encoded 32-byte key/,
  );
});

test('EmailProtectionService encrypts email and derives a stable lookup hash', () => {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';
  process.env.LXP_EMAIL_LOOKUP_KEY =
    'ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA=';

  const encryptionService = new EncryptionService();
  const service = new EmailProtectionService(encryptionService);

  const first = service.protect('Patrick@example.com');
  const second = service.protect('patrick@example.com');

  assert.equal(first.emailHash, second.emailHash);
  assert.notEqual(first.encryptedEmail, 'patrick@example.com');
  assert.equal(service.reveal(first), 'patrick@example.com');
});

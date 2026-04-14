import assert from 'node:assert/strict';
import test from 'node:test';

import { EmailProtectionService } from './email-protection.service';
import { EncryptionService } from './encryption.service';

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

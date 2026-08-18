import assert from 'node:assert/strict';
import test from 'node:test';

import { MailerSendVerificationDeliveryProvider } from './mailersend-verification-delivery.provider';
import { SmtpVerificationDeliveryProvider } from './smtp-verification-delivery.provider';
import { VerificationDeliveryService } from './verification-delivery.service';

test('delivery readiness follows the explicitly selected provider', () => {
  const smtp = new SmtpVerificationDeliveryProvider();
  const mailerSend = new MailerSendVerificationDeliveryProvider();
  const service = new VerificationDeliveryService(smtp, mailerSend);

  process.env.LXP_EMAIL_DELIVERY_PROVIDER = 'smtp';
  process.env.LXP_SMTP_ENABLED = 'false';
  assert.deepEqual(service.getReadiness(), {
    provider: 'smtp',
    status: 'disabled',
    fromEmail: null,
  });

  process.env.LXP_SMTP_ENABLED = 'true';
  delete process.env.LXP_SMTP_HOST;
  assert.equal(service.getReadiness().status, 'not_ready');
  process.env.LXP_SMTP_HOST = 'smtp.example.com';
  process.env.LXP_SMTP_USER = 'user';
  process.env.LXP_SMTP_PASSWORD = 'secret';
  process.env.LXP_SMTP_FROM_EMAIL = 'noreply@example.com';
  assert.equal(service.getReadiness().status, 'ready');

  process.env.LXP_EMAIL_DELIVERY_PROVIDER = 'mailersend';
  delete process.env.LXP_MAILERSEND_API_KEY;
  assert.equal(service.getReadiness().status, 'not_ready');
  process.env.LXP_MAILERSEND_API_KEY = 'secret';
  process.env.LXP_MAILERSEND_FROM_EMAIL = 'noreply@example.com';
  assert.deepEqual(service.getReadiness(), {
    provider: 'mailersend',
    status: 'ready',
    fromEmail: 'noreply@example.com',
  });
});

test('delivery service rejects an unknown provider without fallback', () => {
  const service = new VerificationDeliveryService(
    new SmtpVerificationDeliveryProvider(),
    new MailerSendVerificationDeliveryProvider(),
  );
  process.env.LXP_EMAIL_DELIVERY_PROVIDER = 'unknown';
  assert.throws(
    () => service.getReadiness(),
    /Unsupported email delivery provider/,
  );
});

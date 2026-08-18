import assert from 'node:assert/strict';
import test from 'node:test';

import { PublicConfigController } from './public-config.controller';

test('public runtime config advertises only usable channels and no secrets', async () => {
  process.env.LXP_MAILERSEND_API_KEY = 'must-not-leak';
  process.env.LXP_SMTP_PASSWORD = 'must-not-leak';
  const hostResolver = { resolveRequestHostname: () => 'tenant.example.com' };
  const registration = {
    resolvePublicContext: async () => ({
      registrationEnabled: true,
      tenant: { slug: 'tenant', displayName: 'Tenant' },
    }),
  };
  const verification = { isEmailReady: () => true };
  const controller = new PublicConfigController(
    hostResolver as never,
    registration as never,
    verification as never,
  );

  const result = await controller.getRuntimeConfig({} as never);
  assert.deepEqual(result.verificationChannels, ['email']);
  assert.equal(JSON.stringify(result).includes('must-not-leak'), false);

  verification.isEmailReady = () => false;
  const unavailable = await controller.getRuntimeConfig({} as never);
  assert.deepEqual(unavailable.verificationChannels, []);
});

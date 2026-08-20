import assert from 'node:assert/strict';
import test from 'node:test';

import { validateRuntimeConfig } from './runtime.config';

function createEnvironment(overrides?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'production',
    DATABASE_HOST: 'database',
    DATABASE_NAME: 'lxp',
    DATABASE_USER: 'lxp',
    DATABASE_PASSWORD: 'secret',
    LXP_ENCRYPTION_MASTER_KEY: 'key',
    LXP_EMAIL_LOOKUP_KEY: 'key',
    LXP_ENCRYPTION_KEY_VERSION: '1',
    LXP_COOKIE_SECRET: 'secret',
    LXP_JWT_PRIVATE_KEY: 'key',
    REDIS_URL: 'redis://redis:6379',
    ...overrides,
  };
}

test('runtime config accepts disabled SMTP without credentials', () => {
  assert.doesNotThrow(() =>
    validateRuntimeConfig(
      createEnvironment({
        LXP_EMAIL_DELIVERY_PROVIDER: 'smtp',
        LXP_SMTP_ENABLED: 'false',
      }),
    ),
  );
});

test('runtime config rejects incomplete enabled SMTP and MailerSend', () => {
  assert.throws(
    () =>
      validateRuntimeConfig(
        createEnvironment({
          LXP_EMAIL_DELIVERY_PROVIDER: 'smtp',
          LXP_SMTP_ENABLED: 'true',
        }),
      ),
    /LXP_SMTP_HOST/,
  );
  assert.throws(
    () =>
      validateRuntimeConfig(
        createEnvironment({ LXP_EMAIL_DELIVERY_PROVIDER: 'mailersend' }),
      ),
    /LXP_MAILERSEND_API_KEY/,
  );
});

test('runtime config accepts complete providers and rejects unknown providers', () => {
  assert.doesNotThrow(() =>
    validateRuntimeConfig(
      createEnvironment({
        LXP_EMAIL_DELIVERY_PROVIDER: 'smtp',
        LXP_SMTP_ENABLED: 'true',
        LXP_SMTP_HOST: 'smtp.example.com',
        LXP_SMTP_USER: 'user',
        LXP_SMTP_PASSWORD: 'secret',
        LXP_SMTP_FROM_EMAIL: 'noreply@example.com',
      }),
    ),
  );
  assert.doesNotThrow(() =>
    validateRuntimeConfig(
      createEnvironment({
        LXP_EMAIL_DELIVERY_PROVIDER: 'mailersend',
        LXP_MAILERSEND_API_KEY: 'secret',
        LXP_MAILERSEND_FROM_EMAIL: 'noreply@example.com',
      }),
    ),
  );
  assert.throws(
    () =>
      validateRuntimeConfig(
        createEnvironment({ LXP_EMAIL_DELIVERY_PROVIDER: 'unknown' }),
      ),
    /must be smtp or mailersend/,
  );
});

test('runtime config validates tenant-bound Evaluation Lab service keys', () => {
  assert.doesNotThrow(() =>
    validateRuntimeConfig(
      createEnvironment({
        LXP_ADMIN_EVALUATION_API_KEYS_JSON:
          '{"tenant-1":"integration-api-key"}',
      }),
    ),
  );
  assert.throws(
    () =>
      validateRuntimeConfig(
        createEnvironment({ LXP_ADMIN_EVALUATION_API_KEYS_JSON: 'not-json' }),
      ),
    /must be valid JSON/,
  );
  assert.throws(
    () =>
      validateRuntimeConfig(
        createEnvironment({ LXP_ADMIN_EVALUATION_API_KEYS_JSON: '[]' }),
      ),
    /must map tenant IDs/,
  );
});

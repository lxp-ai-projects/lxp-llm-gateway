import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applySetupAction,
  buildDoctorReport,
  parseEnvFile,
  serializeEnvFile,
} from './env-file.js';
import { DEFAULT_SETUP_ANSWERS } from './env-schema.js';

test('parseEnvFile and serializeEnvFile round-trip setup values', () => {
  const rendered = serializeEnvFile({
    LXP_PUBLIC_APP_URL: 'http://localhost:3003',
    DATABASE_HOST: 'localhost',
    LXP_SETUP_TOKEN_HASH: 'sha256:abc',
  });

  const parsed = parseEnvFile(rendered);

  assert.equal(parsed.LXP_PUBLIC_APP_URL, 'http://localhost:3003');
  assert.equal(parsed.DATABASE_HOST, 'localhost');
  assert.equal(parsed.LXP_SETUP_TOKEN_HASH, 'sha256:abc');
});

test('applySetupAction fill-missing preserves existing values and fills blanks', () => {
  const generated = applySetupAction({
    existingEnv: {
      DATABASE_HOST: 'db.internal',
      LXP_SETUP_TOKEN_HASH: 'sha256:already-present',
      LXP_PUBLIC_APP_URL: '',
    },
    answers: DEFAULT_SETUP_ANSWERS,
    action: 'fill-missing',
  });

  assert.equal(generated.env.DATABASE_HOST, 'db.internal');
  assert.equal(generated.env.LXP_SETUP_TOKEN_HASH, 'sha256:already-present');
  assert.equal(generated.env.LXP_PUBLIC_APP_URL, 'http://localhost:3003');
  assert.equal(generated.rawSetupToken, null);
});

test('applySetupAction rotate-setup-token only rotates the persisted hash', () => {
  const generated = applySetupAction({
    existingEnv: {
      DATABASE_HOST: 'localhost',
      LXP_SETUP_TOKEN_HASH: 'sha256:old-hash',
    },
    answers: DEFAULT_SETUP_ANSWERS,
    action: 'rotate-setup-token',
  });

  assert.equal(generated.env.DATABASE_HOST, 'localhost');
  assert.notEqual(generated.env.LXP_SETUP_TOKEN_HASH, 'sha256:old-hash');
  assert.match(generated.rawSetupToken ?? '', /^lxp_setup_/);
});

test('buildDoctorReport detects missing required variables', () => {
  const report = buildDoctorReport({
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
  });

  assert.equal(report.ok, false);
  assert.equal(
    report.checks.find((check) => check.key === 'DATABASE_HOST')?.ok,
    true,
  );
  assert.equal(
    report.checks.find((check) => check.key === 'LXP_SETUP_TOKEN_HASH')?.ok,
    false,
  );
});


import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const tsxCliPath = require.resolve('tsx/cli');
const mode = process.argv[2] ?? 'test';

const testFiles = [
  'src/admin/admin.service.test.ts',
  'src/admin/admin-catalog.service.test.ts',
  'src/admin/admin-provider-credential.service.test.ts',
  'src/admin/admin-provider-access.test.ts',
  'src/auth/auth-cookie.service.test.ts',
  'src/auth/auth.service.test.ts',
  'src/auth/super-admin-bootstrap.service.test.ts',
  'src/conversation-transfer/conversation-transfer.service.test.ts',
  'src/config/runtime.config.test.ts',
  'src/security/crypto.service.test.ts',
  'src/security/email-protection.service.test.ts',
  'src/security/password.service.test.ts',
  'src/persistence/database.integration.test.ts',
  'src/persistence/registration-verification.migration.test.ts',
  'src/public-config.controller.test.ts',
  'src/registration/tenant-public-host-resolver.service.test.ts',
  'src/registration/tenant-registration.service.test.ts',
  'src/registration-verification/registration-verification.controller.test.ts',
  'src/registration-verification/registration-verification.dto.test.ts',
  'src/registration-verification/registration-verification-rate-limit.service.test.ts',
  'src/registration-verification/registration-verification.service.test.ts',
  'src/registration-verification/delivery/verification-delivery.service.test.ts',
  'src/registration-verification/delivery/verification-email-content.test.ts',
];

const args = [tsxCliPath, '--test', '--test-concurrency=1'];
if (mode === 'coverage') {
  args.push('--experimental-test-coverage');
}

args.push(...testFiles);

const result = spawnSync(process.execPath, args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: process.env,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

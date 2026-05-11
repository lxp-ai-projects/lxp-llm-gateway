#!/usr/bin/env node
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import {
  applySetupAction,
  buildDoctorReport,
  parseEnvFile,
  serializeEnvFile,
} from './env-file.js';
import {
  DEFAULT_SETUP_ANSWERS,
  ROOT_ENV_EXAMPLE_PATH,
  ROOT_ENV_PATH,
  type SetupAction,
} from './env-schema.js';
import {
  colorize,
  promptConfirm,
  promptSelect,
  promptText,
  withReadline,
} from './terminal.js';

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'help';

  if (command === 'init') {
    await runInit();
    return;
  }

  if (command === 'doctor') {
    await runDoctor();
    return;
  }

  printHelp();
  process.exit(command === 'help' ? 0 : 1);
}

async function runInit(): Promise<void> {
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ROOT_ENV_PATH);
  const envExists = await fileExists(envPath);
  const existingEnv = envExists
    ? parseEnvFile(await readFile(envPath, 'utf8'))
    : {};

  const selectedAction = envExists
    ? ((await promptSelect('Existing .env detected. Choose an action:', [
        {
          value: 'fill-missing',
          label: 'Fill missing values only (Recommended)',
        },
        {
          value: 'rotate-setup-token',
          label: 'Rotate setup token only',
        },
        {
          value: 'keep-existing',
          label: 'Keep existing file unchanged',
        },
        {
          value: 'overwrite-all',
          label: 'Overwrite all values',
        },
      ])) as SetupAction)
    : ('overwrite-all' as SetupAction);

  if (selectedAction === 'keep-existing') {
    process.stdout.write(
      `${colorize('yellow', 'No changes written.')}\n${colorize(
        'dim',
        'Run `pnpm setup:doctor` to validate the current root .env.',
      )}\n`,
    );
    return;
  }

  const answers = await withReadline(async (rl) => {
    const defaults = {
      publicAppUrl:
        existingEnv.LXP_PUBLIC_APP_URL ?? DEFAULT_SETUP_ANSWERS.publicAppUrl,
      adminApiUrl:
        existingEnv.LXP_ADMIN_API_URL ?? DEFAULT_SETUP_ANSWERS.adminApiUrl,
      gatewayApiUrl:
        existingEnv.LXP_GATEWAY_API_URL ?? DEFAULT_SETUP_ANSWERS.gatewayApiUrl,
      databaseHost:
        existingEnv.DATABASE_HOST ?? DEFAULT_SETUP_ANSWERS.databaseHost,
      databasePort:
        existingEnv.DATABASE_PORT ?? DEFAULT_SETUP_ANSWERS.databasePort,
      databaseName:
        existingEnv.DATABASE_NAME ?? DEFAULT_SETUP_ANSWERS.databaseName,
      databaseUser:
        existingEnv.DATABASE_USER ?? DEFAULT_SETUP_ANSWERS.databaseUser,
      databasePassword:
        existingEnv.DATABASE_PASSWORD ?? DEFAULT_SETUP_ANSWERS.databasePassword,
      redisUrl: existingEnv.REDIS_URL ?? DEFAULT_SETUP_ANSWERS.redisUrl,
      requestBodyLimit:
        existingEnv.LXP_REQUEST_BODY_LIMIT ??
        DEFAULT_SETUP_ANSWERS.requestBodyLimit,
      openAiCompatApiKey:
        existingEnv.LXP_OPENAI_COMPAT_API_KEY ??
        DEFAULT_SETUP_ANSWERS.openAiCompatApiKey,
      openAiCompatDefaultUserEmail:
        existingEnv.LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL ??
        DEFAULT_SETUP_ANSWERS.openAiCompatDefaultUserEmail,
      enableTrustedIdentity:
        (existingEnv.LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED ?? '')
          .toLowerCase() === 'true'
          ? true
          : DEFAULT_SETUP_ANSWERS.enableTrustedIdentity,
    };

    return {
      publicAppUrl: await promptText(rl, 'Public app URL', defaults.publicAppUrl),
      adminApiUrl: await promptText(rl, 'Admin API URL', defaults.adminApiUrl),
      gatewayApiUrl: await promptText(
        rl,
        'Gateway API URL',
        defaults.gatewayApiUrl,
      ),
      databaseHost: await promptText(rl, 'Database host', defaults.databaseHost),
      databasePort: await promptText(rl, 'Database port', defaults.databasePort),
      databaseName: await promptText(rl, 'Database name', defaults.databaseName),
      databaseUser: await promptText(rl, 'Database user', defaults.databaseUser),
      databasePassword: await promptText(
        rl,
        'Database password',
        defaults.databasePassword,
      ),
      redisUrl: await promptText(rl, 'Redis URL', defaults.redisUrl),
      requestBodyLimit: await promptText(
        rl,
        'Request body limit',
        defaults.requestBodyLimit,
      ),
      openAiCompatApiKey: await promptText(
        rl,
        'OpenAI-compatible API key',
        defaults.openAiCompatApiKey,
      ),
      openAiCompatDefaultUserEmail: await promptText(
        rl,
        'Default OpenAI-compatible user email',
        defaults.openAiCompatDefaultUserEmail,
      ),
      enableTrustedIdentity: await promptConfirm(
        rl,
        'Enable trusted forwarded identity for Open WebUI?',
        defaults.enableTrustedIdentity,
      ),
    };
  });

  const generated = applySetupAction({
    existingEnv,
    answers,
    action: selectedAction,
  });

  await writeFile(envPath, serializeEnvFile(generated.env), 'utf8');
  await ensureRootEnvExample(rootDir);

  process.stdout.write(
    `${colorize('green', 'Root .env written successfully.')}\n`,
  );
  process.stdout.write(
    `${colorize('bold', 'Setup URL:')} ${answers.publicAppUrl.replace(/\/$/, '')}/setup\n`,
  );
  if (generated.rawSetupToken) {
    process.stdout.write(
      `${colorize('bold', 'Setup token:')} ${colorize(
        'yellow',
        generated.rawSetupToken,
      )}\n`,
    );
    process.stdout.write(
      `${colorize(
        'dim',
        'Store this token now. Only its hash is persisted in .env.',
      )}\n`,
    );
  } else {
    process.stdout.write(
      `${colorize(
        'dim',
        'Setup token not changed. The existing raw token cannot be recovered from its hash.',
      )}\n`,
    );
  }
  process.stdout.write(
    `${colorize('bold', 'Next (local dev):')} pnpm dev\n`,
  );
  process.stdout.write(
    `${colorize(
      'bold',
      'Next (support services):',
    )} docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis\n`,
  );
}

async function runDoctor(): Promise<void> {
  const rootDir = process.cwd();
  const envPath = path.join(rootDir, ROOT_ENV_PATH);
  const envExists = await fileExists(envPath);

  if (!envExists) {
    process.stdout.write(
      `${colorize('red', 'Missing root .env')}\n${colorize(
        'dim',
        'Run `pnpm setup:init` first.',
      )}\n`,
    );
    process.exit(1);
  }

  const values = parseEnvFile(await readFile(envPath, 'utf8'));
  const report = buildDoctorReport(values);

  process.stdout.write(`${colorize('bold', 'Setup Doctor')}\n`);
  for (const check of report.checks) {
    process.stdout.write(
      `${check.ok ? colorize('green', 'OK') : colorize('red', 'Missing')} ${check.key}\n`,
    );
  }

  if (!report.ok) {
    process.stdout.write(
      `${colorize(
        'yellow',
        '\nSome required variables are missing. Run `pnpm setup:init` to repair the root .env.',
      )}\n`,
    );
    process.exit(1);
  }

  process.stdout.write(
    `${colorize('green', '\nRoot .env looks ready for the setup wizard.')}\n`,
  );
}

async function ensureRootEnvExample(rootDir: string): Promise<void> {
  const examplePath = path.join(rootDir, ROOT_ENV_EXAMPLE_PATH);
  if (await fileExists(examplePath)) {
    return;
  }

  const template = [
    '# Public URLs',
    'LXP_PUBLIC_APP_URL=http://localhost:3003',
    'LXP_ADMIN_API_URL=http://localhost:3002',
    'LXP_GATEWAY_API_URL=http://localhost:3001',
    'VITE_ADMIN_API_URL=http://localhost:3002',
    'VITE_GATEWAY_API_URL=http://localhost:3001',
    'ADMIN_WEB_ORIGIN=http://localhost:3003,http://127.0.0.1:3003',
    '',
    '# Data Services',
    'DATABASE_HOST=localhost',
    'DATABASE_PORT=5432',
    'DATABASE_NAME=lxp_gateway',
    'DATABASE_USER=lxp_gateway',
    'DATABASE_PASSWORD=change-me',
    'DATABASE_SSL=false',
    'REDIS_URL=redis://localhost:6379',
    '',
    '# Security',
    'LXP_ENCRYPTION_MASTER_KEY=',
    'LXP_EMAIL_LOOKUP_KEY=',
    'LXP_ENCRYPTION_KEY_VERSION=1',
    'LXP_COOKIE_SECRET=',
    'LXP_JWT_PRIVATE_KEY=',
    'LXP_SETUP_TOKEN_HASH=',
    '',
    '# Runtime Defaults',
    'LXP_REQUEST_BODY_LIMIT=10mb',
    'LXP_OPENAI_COMPAT_API_KEY=change-me',
    'LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL=patrick@example.com',
    'LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=false',
    'LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER=X-OpenWebUI-User-Email',
    'LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS=',
    'LXP_OPENAI_COMPAT_DEBUG=false',
    'NANOGPT_BASE_URL=https://nano-gpt.com/api/v1',
    '',
  ].join('\n');

  await writeFile(examplePath, template, 'utf8');
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function printHelp(): void {
  process.stdout.write(
    [
      'Usage: lxp-setup <command>',
      '',
      'Commands:',
      '  init    Create or update the root .env for first-time setup',
      '  doctor  Validate the root .env required by the setup wizard',
      '',
    ].join('\n'),
  );
}

void main();


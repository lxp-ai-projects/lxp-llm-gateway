import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawnSync } from 'node:child_process';

const rootDir = process.cwd();
const quickstartEnvPath = path.join(
  rootDir,
  'infra',
  'compose',
  '.env.quickstart',
);
const composePath = path.join(
  rootDir,
  'infra',
  'compose',
  'docker-compose.quickstart.yml',
);
const quickstartDocPath = path.join(rootDir, 'docs', 'setup', 'quickstart.md');

const REQUIRED_ENV_KEYS = [
  'COMPOSE_PROJECT_NAME',
  'LXP_QUICKSTART_POSTGRES_DB',
  'LXP_QUICKSTART_POSTGRES_USER',
  'LXP_QUICKSTART_POSTGRES_PASSWORD',
  'LXP_QUICKSTART_ENCRYPTION_MASTER_KEY',
  'LXP_QUICKSTART_EMAIL_LOOKUP_KEY',
  'LXP_QUICKSTART_ENCRYPTION_KEY_VERSION',
  'LXP_QUICKSTART_COOKIE_SECRET',
  'LXP_QUICKSTART_JWT_PRIVATE_KEY',
  'LXP_QUICKSTART_OPENAI_COMPAT_API_KEY',
  'LXP_QUICKSTART_OPENAI_COMPAT_DEFAULT_USER_EMAIL',
  'LXP_QUICKSTART_ADMIN_WEB_ORIGIN',
  'LXP_QUICKSTART_ADMIN_API_PUBLIC_URL',
  'LXP_QUICKSTART_GATEWAY_API_PUBLIC_URL',
];

const command = process.argv[2] ?? 'up';
const flags = new Set(process.argv.slice(3));
const openWebUiEnabled = flags.has('--open-webui');

const defaultQuickstartEnv = {
  COMPOSE_PROJECT_NAME: 'lxp-llm-gateway-quickstart',
  LXP_QUICKSTART_POSTGRES_DB: 'lxp_gateway',
  LXP_QUICKSTART_POSTGRES_USER: 'lxp_gateway',
  LXP_QUICKSTART_POSTGRES_PASSWORD: randomHex(24),
  LXP_QUICKSTART_ENCRYPTION_MASTER_KEY: randomBase64(32),
  LXP_QUICKSTART_EMAIL_LOOKUP_KEY: randomBase64(32),
  LXP_QUICKSTART_ENCRYPTION_KEY_VERSION: '1',
  LXP_QUICKSTART_COOKIE_SECRET: randomHex(32),
  LXP_QUICKSTART_JWT_PRIVATE_KEY: randomHex(32),
  LXP_QUICKSTART_OPENAI_COMPAT_API_KEY: randomHex(24),
  LXP_QUICKSTART_OPENAI_COMPAT_DEFAULT_USER_EMAIL: 'admin@example.com',
  LXP_QUICKSTART_ADMIN_WEB_ORIGIN: 'http://localhost:3003',
  LXP_QUICKSTART_ADMIN_API_PUBLIC_URL: 'http://localhost:3002',
  LXP_QUICKSTART_GATEWAY_API_PUBLIC_URL: 'http://localhost:3001',
};

await main();

async function main() {
  switch (command) {
    case 'up':
      await runUp();
      return;
    case 'down':
      runCompose(['down', '--remove-orphans']);
      return;
    case 'logs':
      runCompose(['logs', '-f']);
      return;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      return;
    default:
      console.error(
        `Unknown quickstart command: ${command}\nRun \`node scripts/setup-quickstart.mjs help\` for usage.`,
      );
      process.exit(1);
  }
}

async function runUp() {
  ensureDockerAvailable();
  ensureComposeFileExists();
  ensureQuickstartEnvFile();
  assertRequiredEnvKeys(parseEnvFile(quickstartEnvPath));
  await assertPortsAvailable([
    { port: 3001, service: 'gateway-api' },
    { port: 3002, service: 'admin-api' },
    { port: 3003, service: 'admin-web' },
    { port: 5432, service: 'postgres' },
    { port: 6379, service: 'redis' },
    ...(openWebUiEnabled ? [{ port: 3004, service: 'open-webui' }] : []),
  ]);

  runCompose(['up', '-d', '--build']);
  printSuccessSummary();
}

function printHelp() {
  console.log(`Quickstart commands

- pnpm setup:quickstart
- pnpm setup:quickstart -- --open-webui
- pnpm setup:quickstart:down
- pnpm setup:quickstart:logs

The first run creates ${path.relative(rootDir, quickstartEnvPath)} with local-only secrets.
`);
}

function ensureDockerAvailable() {
  const dockerVersion = spawnSync('docker', ['--version'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (dockerVersion.status !== 0) {
    console.error(
      'Docker is not available on PATH. Install Docker Desktop or Docker Engine, then retry.',
    );
    process.exit(1);
  }

  const composeVersion = spawnSync('docker', ['compose', 'version'], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (composeVersion.status !== 0) {
    console.error(
      'Docker Compose is not available. Verify that `docker compose` works, then retry.',
    );
    process.exit(1);
  }
}

function ensureComposeFileExists() {
  if (fs.existsSync(composePath)) {
    return;
  }

  console.error(
    `Quickstart compose file is missing at ${path.relative(rootDir, composePath)}.`,
  );
  process.exit(1);
}

function ensureQuickstartEnvFile() {
  if (fs.existsSync(quickstartEnvPath)) {
    console.log(
      `Reusing existing quickstart env file: ${path.relative(rootDir, quickstartEnvPath)}`,
    );
    return;
  }

  fs.mkdirSync(path.dirname(quickstartEnvPath), { recursive: true });
  fs.writeFileSync(
    quickstartEnvPath,
    renderEnvFile(defaultQuickstartEnv),
    'utf8',
  );
  console.log(
    `Generated quickstart env file: ${path.relative(rootDir, quickstartEnvPath)}`,
  );
}

function renderEnvFile(values) {
  return [
    '# Local quickstart environment for lxp-llm-gateway',
    '# This file is generated locally and should not be committed.',
    '',
    ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    '',
  ].join('\n');
}

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const values = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    values[key] = value;
  }

  return values;
}

function assertRequiredEnvKeys(values) {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !values[key]);
  if (!missingKeys.length) {
    return;
  }

  console.error(
    `Quickstart env file is missing required values:\n- ${missingKeys.join('\n- ')}\n\nEdit ${path.relative(rootDir, quickstartEnvPath)} or regenerate it.`,
  );
  process.exit(1);
}

async function assertPortsAvailable(requiredPorts) {
  const results = await Promise.all(
    requiredPorts.map(async (entry) => ({
      ...entry,
      available: await canListen(entry.port),
    })),
  );

  const unavailable = results.filter((entry) => !entry.available);
  if (!unavailable.length) {
    return;
  }

  console.error(
    'Quickstart cannot start because these ports are already in use:\n',
  );
  for (const entry of unavailable) {
    console.error(`- ${entry.service}: ${entry.port}`);
  }
  console.error(
    '\nFree the conflicting ports first, then retry. See docs/setup/quickstart.md for troubleshooting.',
  );
  process.exit(1);
}

function canListen(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error) {
        resolve(error.code !== 'EADDRINUSE');
        return;
      }

      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

function runCompose(args) {
  const composeArgs = [
    'compose',
    '--env-file',
    quickstartEnvPath,
    '-f',
    composePath,
  ];

  if (openWebUiEnabled || command !== 'up') {
    composeArgs.push('--profile', 'open-webui');
  }

  composeArgs.push(...args);

  const result = spawnSync('docker', composeArgs, {
    stdio: 'inherit',
    cwd: rootDir,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printSuccessSummary() {
  console.log('\nQuickstart stack is starting.\n');
  console.log('URLs');
  console.log('- Admin UI: http://localhost:3003');
  console.log('- Admin API health: http://localhost:3002/api/v1/health');
  console.log('- Gateway API health: http://localhost:3001/api/v1/health');
  if (openWebUiEnabled) {
    console.log('- Open WebUI: http://localhost:3004');
  }
  console.log('\nNext steps');
  console.log(
    '- Bootstrap the first admin with POST /api/v1/bootstrap/admin on admin-api.',
  );
  console.log('- Sign in to the Admin UI and add a BYOK provider credential.');
  console.log('- Test chat from the UI or through gateway-api.');
  console.log(
    `\nDetailed guide: ${path.relative(rootDir, quickstartDocPath).replace(/\\/g, '/')}`,
  );
}

function randomHex(size) {
  return crypto.randomBytes(size).toString('hex');
}

function randomBase64(size) {
  return crypto.randomBytes(size).toString('base64');
}

import { createHash, randomBytes } from 'node:crypto';

import type { SetupAction, SetupEnvValues, SetupInitAnswers } from './env-schema.js';

export type GeneratedSetupEnv = {
  env: SetupEnvValues;
  rawSetupToken: string | null;
};

export function parseEnvFile(content: string): SetupEnvValues {
  const values: SetupEnvValues = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);
    values[key] = value;
  }

  return values;
}

export function serializeEnvFile(values: SetupEnvValues): string {
  const sections: Array<{ title: string; keys: string[] }> = [
    {
      title: 'Public URLs',
      keys: [
        'LXP_PUBLIC_APP_URL',
        'LXP_ADMIN_API_URL',
        'LXP_GATEWAY_API_URL',
        'VITE_ADMIN_API_URL',
        'VITE_GATEWAY_API_URL',
        'ADMIN_WEB_ORIGIN',
      ],
    },
    {
      title: 'Data Services',
      keys: [
        'DATABASE_HOST',
        'DATABASE_PORT',
        'DATABASE_NAME',
        'DATABASE_USER',
        'DATABASE_PASSWORD',
        'DATABASE_SSL',
        'REDIS_URL',
      ],
    },
    {
      title: 'Security',
      keys: [
        'LXP_ENCRYPTION_MASTER_KEY',
        'LXP_EMAIL_LOOKUP_KEY',
        'LXP_ENCRYPTION_KEY_VERSION',
        'LXP_COOKIE_SECRET',
        'LXP_JWT_PRIVATE_KEY',
        'LXP_SETUP_TOKEN_HASH',
      ],
    },
    {
      title: 'Runtime Defaults',
      keys: [
        'LXP_REQUEST_BODY_LIMIT',
        'LXP_OPENAI_COMPAT_API_KEY',
        'LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL',
        'LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED',
        'LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER',
        'LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS',
        'LXP_OPENAI_COMPAT_DEBUG',
        'NANOGPT_BASE_URL',
      ],
    },
  ];

  const rendered: string[] = [];

  for (const section of sections) {
    const lines = section.keys
      .filter((key) => values[key] !== undefined)
      .map((key) => `${key}=${values[key]}`);

    if (!lines.length) {
      continue;
    }

    if (rendered.length) {
      rendered.push('');
    }

    rendered.push(`# ${section.title}`);
    rendered.push(...lines);
  }

  return `${rendered.join('\n')}\n`;
}

export function buildEnvTemplate(
  answers: SetupInitAnswers,
  setupTokenHash: string,
): SetupEnvValues {
  return {
    LXP_PUBLIC_APP_URL: answers.publicAppUrl,
    LXP_ADMIN_API_URL: answers.adminApiUrl,
    LXP_GATEWAY_API_URL: answers.gatewayApiUrl,
    VITE_ADMIN_API_URL: answers.adminApiUrl,
    VITE_GATEWAY_API_URL: answers.gatewayApiUrl,
    ADMIN_WEB_ORIGIN: buildAdminWebOrigins(answers.publicAppUrl),
    DATABASE_HOST: answers.databaseHost,
    DATABASE_PORT: answers.databasePort,
    DATABASE_NAME: answers.databaseName,
    DATABASE_USER: answers.databaseUser,
    DATABASE_PASSWORD: answers.databasePassword,
    DATABASE_SSL: 'false',
    REDIS_URL: answers.redisUrl,
    LXP_ENCRYPTION_MASTER_KEY: generateBase64Secret(),
    LXP_EMAIL_LOOKUP_KEY: generateBase64Secret(),
    LXP_ENCRYPTION_KEY_VERSION: '1',
    LXP_COOKIE_SECRET: generateHexSecret(32),
    LXP_JWT_PRIVATE_KEY: generateHexSecret(32),
    LXP_SETUP_TOKEN_HASH: setupTokenHash,
    LXP_REQUEST_BODY_LIMIT: answers.requestBodyLimit,
    LXP_OPENAI_COMPAT_API_KEY: answers.openAiCompatApiKey,
    LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL:
      answers.openAiCompatDefaultUserEmail,
    LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED: answers.enableTrustedIdentity
      ? 'true'
      : 'false',
    LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER: 'X-OpenWebUI-User-Email',
    LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS: '',
    LXP_OPENAI_COMPAT_DEBUG: 'false',
    NANOGPT_BASE_URL: 'https://nano-gpt.com/api/v1',
  };
}

export function applySetupAction(input: {
  existingEnv: SetupEnvValues;
  answers: SetupInitAnswers;
  action: SetupAction;
}): GeneratedSetupEnv {
  const baseEnv = buildEnvTemplate(
    input.answers,
    'sha256:placeholder-replaced-later',
  );

  if (input.action === 'keep-existing') {
    return {
      env: { ...input.existingEnv },
      rawSetupToken: null,
    };
  }

  const nextSetupToken = generateSetupToken();
  const nextSetupTokenHash = hashSetupToken(nextSetupToken);
  baseEnv.LXP_SETUP_TOKEN_HASH = nextSetupTokenHash;

  if (input.action === 'overwrite-all') {
    return {
      env: baseEnv,
      rawSetupToken: nextSetupToken,
    };
  }

  if (input.action === 'rotate-setup-token') {
    return {
      env: {
        ...input.existingEnv,
        LXP_SETUP_TOKEN_HASH: nextSetupTokenHash,
      },
      rawSetupToken: nextSetupToken,
    };
  }

  return {
    env: mergeMissingValues(input.existingEnv, baseEnv),
    rawSetupToken: input.existingEnv.LXP_SETUP_TOKEN_HASH
      ? null
      : nextSetupToken,
  };
}

export function buildDoctorReport(values: SetupEnvValues) {
  const required = [
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_NAME',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'REDIS_URL',
    'ADMIN_WEB_ORIGIN',
    'VITE_ADMIN_API_URL',
    'VITE_GATEWAY_API_URL',
    'LXP_PUBLIC_APP_URL',
    'LXP_ADMIN_API_URL',
    'LXP_GATEWAY_API_URL',
    'LXP_ENCRYPTION_MASTER_KEY',
    'LXP_EMAIL_LOOKUP_KEY',
    'LXP_ENCRYPTION_KEY_VERSION',
    'LXP_COOKIE_SECRET',
    'LXP_JWT_PRIVATE_KEY',
    'LXP_SETUP_TOKEN_HASH',
  ];

  const checks = required.map((key) => {
    const value = values[key]?.trim();
    return {
      key,
      ok: Boolean(value),
    };
  });

  return {
    ok: checks.every((check) => check.ok),
    checks,
  };
}

export function hashSetupToken(rawToken: string): string {
  return `sha256:${createHash('sha256').update(rawToken).digest('hex')}`;
}

export function generateSetupToken(): string {
  return `lxp_setup_${randomBytes(24).toString('hex')}`;
}

function generateBase64Secret(): string {
  return randomBytes(32).toString('base64');
}

function generateHexSecret(byteLength: number): string {
  return randomBytes(byteLength).toString('hex');
}

function buildAdminWebOrigins(publicAppUrl: string): string {
  const normalized = publicAppUrl.trim();
  const origins = new Set([
    normalized,
    'http://localhost:3003',
    'http://127.0.0.1:3003',
  ]);

  return [...origins].join(',');
}

function mergeMissingValues(
  existingEnv: SetupEnvValues,
  generatedEnv: SetupEnvValues,
): SetupEnvValues {
  const merged = { ...existingEnv };

  for (const [key, value] of Object.entries(generatedEnv)) {
    const existingValue = merged[key];
    if (existingValue === undefined || existingValue.trim() === '') {
      merged[key] = value;
    }
  }

  return merged;
}


import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';

function getRequiredString(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function getNumber(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number.`);
  }

  return parsed;
}

function getBoolean(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

export function validateRuntimeConfig(
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  getRequiredString('DATABASE_HOST');
  getRequiredString('DATABASE_NAME');
  getRequiredString('DATABASE_USER');
  getRequiredString('DATABASE_PASSWORD');
  getRequiredString('LXP_ENCRYPTION_MASTER_KEY');
  getRequiredString('LXP_ENCRYPTION_KEY_VERSION');
  getRequiredString('LXP_JWT_PRIVATE_KEY');

  return env;
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: getNumber('DATABASE_PORT', 5432),
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: getBoolean('DATABASE_SSL', false)
      ? { rejectUnauthorized: false }
      : false,
    entities: [UserEntity, ProviderEntity, UserProviderCredentialEntity],
    synchronize: false,
    autoLoadEntities: false,
  };
}

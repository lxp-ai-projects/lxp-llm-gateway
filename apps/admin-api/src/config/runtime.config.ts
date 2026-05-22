import path from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

import { ApiKeyEntity } from '../persistence/entities/api-key.entity';
import { IntegrationClientEntity } from '../persistence/entities/integration-client.entity';
import { InstallationStateEntity } from '../persistence/entities/installation-state.entity';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { RoleEntity } from '../persistence/entities/role.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { TenantModelAccessRuleEntity } from '../persistence/entities/tenant-model-access-rule.entity';
import { TenantPolicyEntity } from '../persistence/entities/tenant-policy.entity';
import { TenantProviderConfigurationEntity } from '../persistence/entities/tenant-provider-configuration.entity';
import { UsageEventEntity } from '../persistence/entities/usage-event.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';

const localTestEnvironments = new Set(['test', 'development']);

function getRequiredString(
  env: NodeJS.ProcessEnv,
  key: string,
  options?: { allowEmptyInLocal?: boolean },
): string {
  const value = env[key];
  const allowEmpty =
    options?.allowEmptyInLocal &&
    localTestEnvironments.has(env.NODE_ENV ?? 'development');

  if ((value === undefined || value === '') && !allowEmpty) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value ?? '';
}

function getNumber(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
): number {
  const value = env[key];
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number.`);
  }

  return parsed;
}

function getBoolean(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: boolean,
): boolean {
  const value = env[key];
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

export function validateRuntimeConfig(
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  getRequiredString(env, 'DATABASE_HOST', { allowEmptyInLocal: true });
  getRequiredString(env, 'DATABASE_NAME', { allowEmptyInLocal: true });
  getRequiredString(env, 'DATABASE_USER', { allowEmptyInLocal: true });
  getRequiredString(env, 'DATABASE_PASSWORD', { allowEmptyInLocal: true });
  getRequiredString(env, 'LXP_ENCRYPTION_MASTER_KEY', {
    allowEmptyInLocal: true,
  });
  getRequiredString(env, 'LXP_EMAIL_LOOKUP_KEY', { allowEmptyInLocal: true });
  getRequiredString(env, 'LXP_ENCRYPTION_KEY_VERSION', {
    allowEmptyInLocal: true,
  });
  getRequiredString(env, 'LXP_COOKIE_SECRET', { allowEmptyInLocal: true });
  getRequiredString(env, 'LXP_JWT_PRIVATE_KEY', { allowEmptyInLocal: true });
  getRequiredString(env, 'REDIS_URL', { allowEmptyInLocal: true });

  return env;
}

function getBaseDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: getNumber(process.env, 'DATABASE_PORT', 5432),
    database: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: getBoolean(process.env, 'DATABASE_SSL', false)
      ? { rejectUnauthorized: false }
      : false,
    entities: [
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      ProviderEntity,
      IntegrationClientEntity,
      ApiKeyEntity,
      TenantEntity,
      TenantMembershipEntity,
      TenantModelAccessRuleEntity,
      TenantPolicyEntity,
      TenantProviderConfigurationEntity,
      UsageEventEntity,
      UserProviderCredentialEntity,
      InstallationStateEntity,
    ],
    synchronize: false,
  };
}

export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  return {
    ...getBaseDataSourceOptions(),
    autoLoadEntities: false,
  };
}

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    ...getBaseDataSourceOptions(),
    migrations: [path.join(__dirname, '..', 'persistence', 'migrations', '*.{js,ts}')],
  };
}

import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';

import { ApiKeyEntity } from '../persistence/entities/api-key.entity';
import { AuditLogEntity } from '../persistence/entities/audit-log.entity';
import { ImageAssetEntity } from '../persistence/entities/image-asset.entity';
import { ImageJobEntity } from '../persistence/entities/image-job.entity';
import { ImageJobResultEntity } from '../persistence/entities/image-job-result.entity';
import { IntegrationClientEntity } from '../persistence/entities/integration-client.entity';
import { MediaAssetEntity } from '../persistence/entities/media-asset.entity';
import { MediaGenerationJobEntity } from '../persistence/entities/media-generation-job.entity';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { TenantModelAccessRuleEntity } from '../persistence/entities/tenant-model-access-rule.entity';
import { TenantPolicyEntity } from '../persistence/entities/tenant-policy.entity';
import { TenantProviderConfigurationEntity } from '../persistence/entities/tenant-provider-configuration.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { UsageEventEntity } from '../persistence/entities/usage-event.entity';

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

function getBaseDataSourceOptions(): DataSourceOptions {
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
    entities: [
      UserEntity,
      TenantEntity,
      TenantMembershipEntity,
      TenantModelAccessRuleEntity,
      TenantPolicyEntity,
      IntegrationClientEntity,
      ApiKeyEntity,
      AuditLogEntity,
      UsageEventEntity,
      ProviderEntity,
      UserProviderCredentialEntity,
      TenantProviderConfigurationEntity,
      ImageAssetEntity,
      ImageJobEntity,
      ImageJobResultEntity,
      MediaAssetEntity,
      MediaGenerationJobEntity,
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
    migrations: ['src/persistence/migrations/*.ts'],
  };
}

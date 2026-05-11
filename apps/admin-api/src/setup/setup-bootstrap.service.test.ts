import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { DataSource } from 'typeorm';

import { ApiKeyEntity } from '../persistence/entities/api-key.entity';
import {
  INSTALLATION_STATE_SINGLETON_ID,
  InstallationStateEntity,
  type InstallationStateEntity as InstallationStateEntityType,
} from '../persistence/entities/installation-state.entity';
import { IntegrationClientEntity } from '../persistence/entities/integration-client.entity';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { RoleEntity } from '../persistence/entities/role.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { TenantPolicyEntity } from '../persistence/entities/tenant-policy.entity';
import { TenantProviderConfigurationEntity } from '../persistence/entities/tenant-provider-configuration.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
import { SetupBootstrapService } from './setup-bootstrap.service';

type RepoStore<T extends { id?: string }> = {
  data: T[];
  findOne: (input: { where: Partial<T>; lock?: unknown }) => Promise<T | null>;
  create: (value: T) => T;
  save: (value: T | T[]) => Promise<T | T[]>;
};

function createRepositoryMock<T extends { id?: string }>(
  initialData: T[] = [],
): RepoStore<T> {
  const data = [...initialData];

  function matchesWhere(item: T, where: Partial<T>): boolean {
    return Object.entries(where).every(([key, value]) => {
      return item[key as keyof T] === value;
    });
  }

  return {
    data,
    async findOne({ where }: { where: Partial<T> }): Promise<T | null> {
      return data.find((item) => matchesWhere(item, where)) ?? null;
    },
    create(value: T): T {
      return {
        ...value,
        id: value.id ?? randomUUID(),
      };
    },
    async save(value: T | T[]): Promise<T | T[]> {
      const saveOne = (entry: T) => {
        const now = new Date();
        const normalized = {
          ...entry,
          id: entry.id ?? randomUUID(),
        } as T;
        if ('createdAt' in normalized && !normalized.createdAt) {
          normalized.createdAt = now as never;
        }
        if ('updatedAt' in normalized) {
          normalized.updatedAt = now as never;
        }
        const existingIndex = data.findIndex(
          (item) => item.id === normalized.id,
        );
        if (existingIndex >= 0) {
          data[existingIndex] = {
            ...data[existingIndex],
            ...normalized,
          };
        } else {
          data.push(normalized);
        }

        return normalized;
      };

      if (Array.isArray(value)) {
        return value.map((entry) => saveOne(entry));
      }

      return saveOne(value);
    },
  };
}

function createTestContext() {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';
  process.env.LXP_EMAIL_LOOKUP_KEY =
    'ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA=';

  const installationStateRepository =
    createRepositoryMock<InstallationStateEntityType>([]);
  const roleRepository = createRepositoryMock<RoleEntity>([
    {
      id: randomUUID(),
      name: 'super_admin',
      description: 'Global administrator',
    } as RoleEntity,
  ]);
  const userRoleRepository = createRepositoryMock<UserRoleEntity>([]);
  const userRepository = createRepositoryMock<UserEntity>([]);
  const tenantRepository = createRepositoryMock<TenantEntity>([]);
  const tenantMembershipRepository =
    createRepositoryMock<TenantMembershipEntity>([]);
  const tenantPolicyRepository = createRepositoryMock<TenantPolicyEntity>([]);
  const providerRepository = createRepositoryMock<ProviderEntity>([
    {
      id: randomUUID(),
      providerId: 'nanogpt',
      displayName: 'NanoGPT',
      status: 'active',
    } as ProviderEntity,
    {
      id: randomUUID(),
      providerId: 'openrouter',
      displayName: 'OpenRouter',
      status: 'active',
    } as ProviderEntity,
  ]);
  const credentialRepository = createRepositoryMock<UserProviderCredentialEntity>(
    [],
  );
  const tenantProviderConfigurationRepository =
    createRepositoryMock<TenantProviderConfigurationEntity>([]);
  const integrationClientRepository =
    createRepositoryMock<IntegrationClientEntity>([]);
  const apiKeyRepository = createRepositoryMock<ApiKeyEntity>([]);

  const repositories = new Map<unknown, RepoStore<any>>([
    [InstallationStateEntity, installationStateRepository],
    [RoleEntity, roleRepository],
    [UserRoleEntity, userRoleRepository],
    [UserEntity, userRepository],
    [TenantEntity, tenantRepository],
    [TenantMembershipEntity, tenantMembershipRepository],
    [TenantPolicyEntity, tenantPolicyRepository],
    [ProviderEntity, providerRepository],
    [UserProviderCredentialEntity, credentialRepository],
    [TenantProviderConfigurationEntity, tenantProviderConfigurationRepository],
    [IntegrationClientEntity, integrationClientRepository],
    [ApiKeyEntity, apiKeyRepository],
  ]);

  const dataSource = {
    async transaction<T>(
      callback: (manager: { getRepository: (entity: unknown) => RepoStore<any> }) => Promise<T>,
    ): Promise<T> {
      const snapshots = new Map<unknown, any[]>();
      for (const [entity, repository] of repositories.entries()) {
        snapshots.set(entity, structuredClone(repository.data));
      }

      try {
        return await callback({
          getRepository(entity: unknown) {
            const repository = repositories.get(entity);
            if (!repository) {
              throw new Error('Unknown repository requested in test.');
            }

            return repository;
          },
        });
      } catch (error) {
        for (const [entity, snapshot] of snapshots.entries()) {
          const repository = repositories.get(entity);
          if (!repository) {
            continue;
          }
          repository.data.splice(0, repository.data.length, ...snapshot);
        }
        throw error;
      }
    },
  } satisfies Pick<DataSource, 'transaction'>;

  const service = new SetupBootstrapService(
    dataSource as DataSource,
    new EmailProtectionService(new EncryptionService()),
    new EncryptionService(),
    new PasswordService(),
  );

  return {
    service,
    repositories: {
      installationStateRepository,
      roleRepository,
      userRoleRepository,
      userRepository,
      tenantRepository,
      tenantMembershipRepository,
      tenantPolicyRepository,
      providerRepository,
      credentialRepository,
      tenantProviderConfigurationRepository,
      integrationClientRepository,
      apiKeyRepository,
    },
  };
}

test('SetupBootstrapService bootstraps the first install exactly once', async () => {
  const { service, repositories } = createTestContext();

  const result = await service.bootstrap({
    superAdmin: {
      email: 'patrick@example.com',
      password: 'Sup3rS3cret!',
      displayName: 'Patrick',
    },
    tenant: {
      slug: 'Laurie-Co',
      displayName: 'Laurie Co',
    },
    providerCredentials: [
      {
        providerId: 'nanogpt',
        label: 'primary',
        apiToken: 'nano-secret-token',
        defaultTextModel: 'z-ai/glm-4.6',
      },
    ],
    tenantPolicy: {
      requestsPerMinute: 120,
      tokensPerMinute: 200000,
    },
    openWebUi: {
      enabled: true,
      trustedForwardedIdentityEnabled: true,
    },
  });

  assert.equal(result.setupCompleted, true);
  assert.equal(result.tenant.slug, 'laurie-co');
  assert.equal(result.superAdmin.email, 'patrick@example.com');
  assert.match(result.openWebUi?.apiKey ?? '', /^lxp_/);
  assert.equal(repositories.userRepository.data.length, 1);
  assert.equal(repositories.tenantRepository.data.length, 1);
  assert.equal(repositories.tenantMembershipRepository.data.length, 1);
  assert.equal(repositories.userRoleRepository.data.length, 1);
  assert.equal(repositories.credentialRepository.data.length, 1);
  assert.equal(
    repositories.tenantProviderConfigurationRepository.data[0]
      ?.credentialMode,
    'tenant_byok',
  );
  assert.equal(
    repositories.installationStateRepository.data[0]?.id,
    INSTALLATION_STATE_SINGLETON_ID,
  );
  assert.equal(
    repositories.installationStateRepository.data[0]?.status,
    'COMPLETED',
  );
  assert.notEqual(
    repositories.credentialRepository.data[0]?.encryptedSecret,
    JSON.stringify({ apiKey: 'nano-secret-token' }),
  );

  await assert.rejects(
    () =>
      service.bootstrap({
        superAdmin: {
          email: 'second@example.com',
          password: 'Sup3rS3cret!',
          displayName: 'Second',
        },
        tenant: {
          slug: 'second-tenant',
          displayName: 'Second Tenant',
        },
      }),
    /Setup is no longer available/,
  );
});

test('SetupBootstrapService rolls back all writes if bootstrap fails mid-transaction', async () => {
  const { service, repositories } = createTestContext();

  await assert.rejects(
    () =>
      service.bootstrap({
        superAdmin: {
          email: 'patrick@example.com',
          password: 'Sup3rS3cret!',
          displayName: 'Patrick',
        },
        tenant: {
          slug: 'rollback-tenant',
          displayName: 'Rollback Tenant',
        },
        providerCredentials: [
          {
            providerId: 'xai' as never,
            label: 'bad-provider',
            apiToken: 'secret-token',
          },
        ],
      }),
    /Unknown provider in setup payload/,
  );

  assert.equal(repositories.userRepository.data.length, 0);
  assert.equal(repositories.tenantRepository.data.length, 0);
  assert.equal(repositories.tenantMembershipRepository.data.length, 0);
  assert.equal(repositories.userRoleRepository.data.length, 0);
  assert.equal(repositories.credentialRepository.data.length, 0);
  assert.equal(repositories.apiKeyRepository.data.length, 0);
  assert.equal(repositories.installationStateRepository.data.length, 0);
});

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { DataType, newDb } from 'pg-mem';

import { ProviderEntity } from './entities/provider.entity';
import { RoleEntity } from './entities/role.entity';
import { TenantEntity } from './entities/tenant.entity';
import { TenantMembershipEntity } from './entities/tenant-membership.entity';
import { TenantModelAccessRuleEntity } from './entities/tenant-model-access-rule.entity';
import { TenantProviderConfigurationEntity } from './entities/tenant-provider-configuration.entity';
import { TenantPolicyEntity } from './entities/tenant-policy.entity';
import { UserEntity } from './entities/user.entity';
import { UserProviderCredentialEntity } from './entities/user-provider-credential.entity';
import { UserRoleEntity } from './entities/user-role.entity';

test('database entity graph initializes against a Postgres-compatible in-memory database', async () => {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });
  db.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 16.0',
  });
  db.public.registerFunction({
    name: 'current_database',
    returns: DataType.text,
    implementation: () => 'pg_mem_test',
  });
  db.public.registerFunction({
    name: 'current_schema',
    returns: DataType.text,
    implementation: () => 'public',
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });
  const dataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      TenantEntity,
      TenantMembershipEntity,
      TenantModelAccessRuleEntity,
      TenantProviderConfigurationEntity,
      TenantPolicyEntity,
      ProviderEntity,
      UserProviderCredentialEntity,
    ],
    synchronize: true,
  });

  await dataSource.initialize();

  const providerRepository = dataSource.getRepository(ProviderEntity);
  const userRepository = dataSource.getRepository(UserEntity);
  const user = userRepository.create({
    userUuid: randomUUID(),
    emailHash: 'hash',
    encryptedEmail: 'cipher',
    emailIv: 'iv',
    emailAuthTag: 'tag',
    emailKeyVersion: 1,
    passwordHash: 'hash',
    displayName: 'Patrick',
    status: 'active',
  });
  await userRepository.save(user);
  assert.ok(user.userUuid);

  const provider = providerRepository.create({
    id: randomUUID(),
    providerId: 'nanogpt',
    displayName: 'NanoGPT',
    status: 'active',
  });
  const openRouterProvider = providerRepository.create({
    id: randomUUID(),
    providerId: 'openrouter',
    displayName: 'OpenRouter',
    status: 'active',
  });
  const ollamaProvider = providerRepository.create({
    id: randomUUID(),
    providerId: 'ollama',
    displayName: 'Ollama',
    status: 'active',
  });
  await providerRepository.save(provider);
  await providerRepository.save(openRouterProvider);
  await providerRepository.save(ollamaProvider);

  const providers = await providerRepository.find();
  assert.equal(providers.length, 3);
  assert.deepEqual(
    providers.map((entry: ProviderEntity) => entry.providerId).sort(),
    ['nanogpt', 'ollama', 'openrouter'],
  );

  const roleRepository = dataSource.getRepository(RoleEntity);
  const role = roleRepository.create({
    name: 'admin',
    description: 'Administrator',
  });
  await roleRepository.save(role);
  assert.ok(role.id);

  await dataSource.destroy();
});

test('provider credential uniqueness stays isolated by tenant, user, and scope', async () => {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });
  db.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 16.0',
  });
  db.public.registerFunction({
    name: 'current_database',
    returns: DataType.text,
    implementation: () => 'pg_mem_test',
  });
  db.public.registerFunction({
    name: 'current_schema',
    returns: DataType.text,
    implementation: () => 'public',
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });

  const dataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      TenantEntity,
      TenantMembershipEntity,
      TenantModelAccessRuleEntity,
      TenantProviderConfigurationEntity,
      TenantPolicyEntity,
      ProviderEntity,
      UserProviderCredentialEntity,
    ],
    synchronize: true,
  });

  await dataSource.initialize();

  const tenantRepository = dataSource.getRepository(TenantEntity);
  const userRepository = dataSource.getRepository(UserEntity);
  const providerRepository = dataSource.getRepository(ProviderEntity);
  const credentialRepository = dataSource.getRepository(
    UserProviderCredentialEntity,
  );

  const tenantOne = await tenantRepository.save(
    tenantRepository.create({
      id: randomUUID(),
      slug: 'tenant-one',
      displayName: 'Tenant One',
      allowUserCredentialOverride: true,
      status: 'active',
    }),
  );
  const tenantTwo = await tenantRepository.save(
    tenantRepository.create({
      id: randomUUID(),
      slug: 'tenant-two',
      displayName: 'Tenant Two',
      allowUserCredentialOverride: true,
      status: 'active',
    }),
  );

  const userOne = await userRepository.save(
    userRepository.create({
      id: randomUUID(),
      userUuid: randomUUID(),
      emailHash: 'hash-user-1',
      encryptedEmail: 'cipher-1',
      emailIv: 'iv-1',
      emailAuthTag: 'tag-1',
      emailKeyVersion: 1,
      passwordHash: 'password-hash-1',
      displayName: 'User One',
      status: 'active',
    }),
  );
  const userTwo = await userRepository.save(
    userRepository.create({
      id: randomUUID(),
      userUuid: randomUUID(),
      emailHash: 'hash-user-2',
      encryptedEmail: 'cipher-2',
      emailIv: 'iv-2',
      emailAuthTag: 'tag-2',
      emailKeyVersion: 1,
      passwordHash: 'password-hash-2',
      displayName: 'User Two',
      status: 'active',
    }),
  );

  const provider = await providerRepository.save(
    providerRepository.create({
      id: randomUUID(),
      providerId: 'nanogpt',
      displayName: 'NanoGPT',
      status: 'active',
    }),
  );

  await credentialRepository.save(
    credentialRepository.create({
      id: randomUUID(),
      tenantId: tenantOne.id,
      userId: null,
      providerId: provider.id,
      scope: 'tenant',
      label: 'shared-default',
      encryptedSecret: 'cipher-tenant-1',
      iv: 'iv-tenant-1',
      authTag: 'tag-tenant-1',
      keyVersion: 1,
      isActive: true,
      maskedHint: '***ant',
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await assert.rejects(
    () =>
      credentialRepository.save(
        credentialRepository.create({
          id: randomUUID(),
          tenantId: tenantOne.id,
          userId: null,
          providerId: provider.id,
          scope: 'tenant',
          label: 'shared-default',
          encryptedSecret: 'cipher-tenant-duplicate',
          iv: 'iv-tenant-duplicate',
          authTag: 'tag-tenant-duplicate',
          keyVersion: 1,
          isActive: true,
          maskedHint: '***dup',
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
  );

  await credentialRepository.save(
    credentialRepository.create({
      id: randomUUID(),
      tenantId: tenantTwo.id,
      userId: null,
      providerId: provider.id,
      scope: 'tenant',
      label: 'shared-default',
      encryptedSecret: 'cipher-tenant-2',
      iv: 'iv-tenant-2',
      authTag: 'tag-tenant-2',
      keyVersion: 1,
      isActive: true,
      maskedHint: '***ant',
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await credentialRepository.save(
    credentialRepository.create({
      id: randomUUID(),
      tenantId: tenantOne.id,
      userId: userOne.id,
      providerId: provider.id,
      scope: 'user',
      label: 'personal-default',
      encryptedSecret: 'cipher-user-1',
      iv: 'iv-user-1',
      authTag: 'tag-user-1',
      keyVersion: 1,
      isActive: true,
      maskedHint: '***one',
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await assert.rejects(
    () =>
      credentialRepository.save(
        credentialRepository.create({
          id: randomUUID(),
          tenantId: tenantOne.id,
          userId: userOne.id,
          providerId: provider.id,
          scope: 'user',
          label: 'personal-default',
          encryptedSecret: 'cipher-user-duplicate',
          iv: 'iv-user-duplicate',
          authTag: 'tag-user-duplicate',
          keyVersion: 1,
          isActive: true,
          maskedHint: '***dup',
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
  );

  await credentialRepository.save(
    credentialRepository.create({
      id: randomUUID(),
      tenantId: tenantOne.id,
      userId: userTwo.id,
      providerId: provider.id,
      scope: 'user',
      label: 'personal-default',
      encryptedSecret: 'cipher-user-2',
      iv: 'iv-user-2',
      authTag: 'tag-user-2',
      keyVersion: 1,
      isActive: true,
      maskedHint: '***two',
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );

  await dataSource.destroy();
});
